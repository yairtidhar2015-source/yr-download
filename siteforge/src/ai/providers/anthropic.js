// Claude (Anthropic API) text provider.
import Anthropic from '@anthropic-ai/sdk';
import { AiProviderError } from '../errors.js';

export function createAnthropicProvider({ model, effort }) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

  return {
    id: 'anthropic',
    label: 'Claude',
    model,
    /**
     * Stream a completion. Calls onText(delta) as text arrives and resolves with
     * the full text. Throws AiProviderError on any failure (no credits are charged).
     */
    async complete({ system, messages, onText, signal, effort: opEffort }) {
      let stream;
      try {
        stream = client.beta.messages.stream({
          model,
          max_tokens: 64000,
          // Server-side fallback: if a safety classifier declines, the API
          // retries on a recommended fallback model inside the same call.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          thinking: { type: 'adaptive' },
          output_config: { effort: opEffort || effort },
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages,
        }, { signal });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') onText(event.delta.text);
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') throw new AiProviderError('refused', 'The AI declined this request. Try rephrasing it.');
        if (final.stop_reason === 'max_tokens') throw new AiProviderError('too_long', 'The response was too long. Try a smaller change or fewer pages at once.');
        const text = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
        return { text, model: final.model, usage: final.usage };
      } catch (err) {
        if (err instanceof AiProviderError) throw err;
        if (signal?.aborted || err instanceof Anthropic.APIUserAbortError) throw new AiProviderError('aborted', 'Request cancelled.');
        if (err instanceof Anthropic.AuthenticationError) throw new AiProviderError('config', 'AI is not configured correctly (API key rejected).');
        if (err instanceof Anthropic.RateLimitError) throw new AiProviderError('busy', 'The AI is busy right now. Please try again in a minute.');
        if (err instanceof Anthropic.BadRequestError) throw new AiProviderError('bad_request', 'The AI could not process this request (it may be too large).');
        if (err instanceof Anthropic.APIError) throw new AiProviderError('upstream', `AI service error${err.status ? ` (${err.status})` : ''}. Please try again.`);
        throw new AiProviderError('upstream', 'Could not reach the AI service. Please try again.');
      }
    },
  };
}
