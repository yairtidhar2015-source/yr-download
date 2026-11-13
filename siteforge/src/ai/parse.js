import { FILE_PATH_RE } from '../projects.js';

export class AiOutputError extends Error {
  constructor(message) { super(message); this.code = 'ai_output_invalid'; }
}

const PROTECTED = new Set(['index.html', 'styles.css']);

/** Parse the model's full response into { message, files: {path: content}, deletes: [] }. */
export function parseAiOutput(text) {
  const cleaned = text.replace(/^```[a-z]*\n?|```\s*$/gm, '');
  const msgMatch = cleaned.match(/<message>\s*([\s\S]*?)\s*<\/message>/);
  const files = {};
  const deletes = [];
  const fileRe = /<file path="([^"]+)">\r?\n?([\s\S]*?)\r?\n?<\/file>/g;
  let m;
  while ((m = fileRe.exec(cleaned))) {
    const path = m[1].trim().replace(/^\.?\//, '');
    if (!FILE_PATH_RE.test(path)) throw new AiOutputError(`The AI produced an invalid file name (${path}).`);
    files[path] = m[2];
  }
  const delRe = /<delete path="([^"]+)"\s*\/>/g;
  while ((m = delRe.exec(cleaned))) {
    const path = m[1].trim();
    if (FILE_PATH_RE.test(path) && !PROTECTED.has(path)) deletes.push(path);
  }
  const message = msgMatch ? msgMatch[1].trim() : '';
  if (!message && Object.keys(files).length === 0) throw new AiOutputError('The AI response could not be read.');
  return { message: message || 'Done – your site has been updated.', files, deletes };
}

/** Apply parsed changes to a copy of the project's files. Returns { files, changed: [paths] }. */
export function applyChanges(current, { files, deletes }) {
  const next = { ...current };
  const changed = [];
  for (const [p, c] of Object.entries(files)) {
    if (p.endsWith('.svg') && /<script|<foreignObject|\son[a-z]+\s*=|javascript:/i.test(c)) throw new AiOutputError('The generated image contained unsafe content.');
    if (next[p] !== c) { next[p] = c; changed.push(p); }
  }
  for (const p of deletes) if (p in next) { delete next[p]; changed.push(p); }
  return { files: next, changed };
}

/**
 * Incremental view of a streaming response for the UI: the text inside
 * <message> so far, and the list of files the model has started writing.
 */
export function streamView(text) {
  const start = text.indexOf('<message>');
  let message = '';
  if (start !== -1) {
    const end = text.indexOf('</message>', start);
    message = text.slice(start + 9, end === -1 ? undefined : end);
    // Don't show a half-written closing tag
    if (end === -1) message = message.replace(/<\/?m?e?s?s?a?g?e?$/, '');
    message = message.replace(/^\s+/, '');
  }
  const files = [...text.matchAll(/<file path="([^"]+)">/g)].map((x) => x[1]);
  return { message, files };
}
