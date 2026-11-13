// AI orchestration: provider registry + the credit-safe operation runner.
//
// To add another model/provider later: write a module exporting an object with
// { id, label, model, complete({ system, messages, onText, signal, effort, context }) }
// and register it in PROVIDERS below. Operation pricing lives in config/pricing.json.
import { config } from '../config.js';
import { db } from '../db.js';
import { getOperation } from '../pricing.js';
import * as credits from '../credits.js';
import { HttpError } from '../util.js';
import { getProject, saveFiles, addChatMessage, chatHistory, validateFiles } from '../projects.js';
import { SYSTEM_PROMPT, buildUserMessage } from './prompts.js';
import { parseAiOutput, applyChanges, streamView } from './parse.js';
import { AiProviderError } from './errors.js';
import { createAnthropicProvider } from './providers/anthropic.js';
import { createMockProvider } from './providers/mock.js';

const PROVIDERS = {
  anthropic: () => createAnthropicProvider({ model: config.ai.model, effort: config.ai.effort }),
  mock: () => createMockProvider(),
};

let provider = null;
export function getProvider() {
  if (config.ai.provider === 'none') return null;
  if (!provider) {
    const factory = PROVIDERS[config.ai.provider];
    if (!factory) throw new Error(`Unknown AI_PROVIDER "${config.ai.provider}"`);
    provider = factory();
  }
  return provider;
}

// One AI operation per project at a time.
const busyProjects = new Set();

function buildMessages(projectId, finalUserContent) {
  // Previous successful turns (text only – the current files are sent fresh each time).
  const history = chatHistory(projectId, config.ai.maxHistoryTurns * 2 + 2);
  const turns = [];
  for (let i = 0; i < history.length - 1; i++) {
    const u = history[i]; const a = history[i + 1];
    if (u.role === 'user' && a.role === 'assistant' && a.status === 'ok') {
      turns.push({ role: 'user', content: u.content }, { role: 'assistant', content: a.content });
      i++;
    }
  }
  return [...turns.slice(-config.ai.maxHistoryTurns * 2), { role: 'user', content: finalUserContent }];
}

/**
 * Run one AI operation for a user. `emit(event, data)` streams progress to the client.
 * Credits: reserved up front (fails fast with 402 if insufficient), captured only if
 * the AI produced valid changes that were saved, released in every other case.
 */
export async function runOperation({ user, projectId, operationId, prompt, currentPage, signal, emit }) {
  const ai = getProvider();
  if (!ai) throw new HttpError(503, 'ai_disabled', 'AI is not configured on this server yet.');
  const op = getOperation(operationId);
  if (!op) throw new HttpError(400, 'invalid_operation', 'Unknown AI operation.');
  prompt = String(prompt || '').trim();
  if (!prompt) throw new HttpError(400, 'empty_prompt', 'Please describe what you want.');
  if (prompt.length > 4000) throw new HttpError(400, 'prompt_too_long', 'Please keep requests under 4,000 characters.');

  const project = getProject(user.id, projectId);
  if (busyProjects.has(projectId)) throw new HttpError(409, 'busy', 'The AI is already working on this project.');

  const holdId = credits.reserve(user.id, op.credits, op.id); // throws 402 when short
  busyProjects.add(projectId);
  emit('start', { operation: op.id, cost: op.credits, provider: ai.label });

  let streamed = '';
  let lastMsgLen = 0;
  const seenFiles = new Set();
  try {
    const uploads = db.prepare('SELECT id, filename FROM uploads WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(user.id)
      .map((u) => ({ url: `/u/${u.id}`, filename: u.filename }));
    const userContent = buildUserMessage({ project, operation: op.id, prompt, currentPage, uploads });
    const result = await ai.complete({
      system: SYSTEM_PROMPT,
      messages: buildMessages(projectId, userContent),
      effort: op.id === 'create_site' ? 'high' : undefined,
      signal,
      context: { project, operation: op.id, prompt },
      onText: (delta) => {
        streamed += delta;
        const view = streamView(streamed);
        if (view.message.length > lastMsgLen) { emit('text', { delta: view.message.slice(lastMsgLen) }); lastMsgLen = view.message.length; }
        for (const f of view.files) if (!seenFiles.has(f)) { seenFiles.add(f); emit('file', { path: f }); }
      },
    });

    const parsed = parseAiOutput(result.text);
    const { files, changed } = applyChanges(project.files, parsed);

    if (changed.length === 0) {
      // A clarifying question or "nothing to change" – free.
      credits.release(holdId);
      addChatMessage(projectId, { role: 'user', content: prompt, operation: op.id });
      addChatMessage(projectId, { role: 'assistant', content: parsed.message, operation: op.id, credits: 0 });
      return { message: parsed.message, changed, charged: 0, balance: credits.getBalance(user.id).available };
    }

    validateFiles(files);
    const saved = saveFiles(user.id, projectId, files, { source: 'ai', note: `${op.label}: ${prompt.slice(0, 80)}` });
    const { balance } = credits.capture(holdId, `${op.label} – “${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}”`);
    addChatMessage(projectId, { role: 'user', content: prompt, operation: op.id });
    addChatMessage(projectId, { role: 'assistant', content: parsed.message, operation: op.id, credits: op.credits });
    return { message: parsed.message, changed, charged: op.credits, balance: balance.available, files: saved.files };
  } catch (err) {
    credits.release(holdId);
    if (err instanceof AiProviderError || err.code === 'ai_output_invalid' || err.code === 'invalid_files') {
      addChatMessage(projectId, { role: 'user', content: prompt, operation: op.id, status: 'error' });
      addChatMessage(projectId, { role: 'assistant', content: `${err.message} No credits were used.`, operation: op.id, credits: 0, status: 'error' });
      throw new HttpError(err.code === 'busy' ? 503 : 502, err.code || 'ai_failed', `${err.message} No credits were used.`);
    }
    throw err;
  } finally {
    busyProjects.delete(projectId);
  }
}
