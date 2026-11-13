import { db, tx } from './db.js';
import { config } from './config.js';
import { HttpError, newId } from './util.js';
import { buildTemplate } from './templates.js';

export const FILE_PATH_RE = /^(?:assets\/)?[a-z0-9][a-z0-9_-]{0,60}\.(?:html|css|js|svg)$/;
export const MAX_FILES = 30;
export const MAX_FILE_BYTES = 400_000;
const MAX_VERSIONS = 40;

export function validateFiles(files) {
  if (!files || typeof files !== 'object' || Array.isArray(files)) throw new HttpError(400, 'invalid_files', 'Invalid files.');
  const entries = Object.entries(files);
  if (entries.length === 0 || entries.length > MAX_FILES) throw new HttpError(400, 'invalid_files', `A site can have 1–${MAX_FILES} files.`);
  for (const [p, content] of entries) {
    if (!FILE_PATH_RE.test(p)) throw new HttpError(400, 'invalid_files', `Invalid file name: ${p}`);
    if (typeof content !== 'string' || Buffer.byteLength(content) > MAX_FILE_BYTES) throw new HttpError(400, 'invalid_files', `File too large: ${p}`);
  }
  if (!files['index.html']) throw new HttpError(400, 'invalid_files', 'index.html is required.');
  return files;
}

const row = (r) => r && { id: r.id, name: r.name, template: r.template, files: JSON.parse(r.files_json), createdAt: r.created_at, updatedAt: r.updated_at };

export function listProjects(userId) {
  return db.prepare('SELECT id, name, template, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(userId)
    .map((r) => ({ id: r.id, name: r.name, template: r.template, createdAt: r.created_at, updatedAt: r.updated_at }));
}

export function getProject(userId, projectId) {
  const r = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
  if (!r) throw new HttpError(404, 'not_found', 'Project not found.');
  return row(r);
}

export function createProject(userId, { name, template = 'blank' }) {
  const files = buildTemplate(template, { brand: name });
  if (!files) throw new HttpError(400, 'invalid_template', 'Unknown template.');
  return tx(() => {
    const count = db.prepare('SELECT COUNT(*) AS n FROM projects WHERE user_id = ?').get(userId).n;
    if (count >= config.maxProjectsPerUser) {
      throw new HttpError(403, 'project_limit',
        `Free accounts include ${config.maxProjectsPerUser} website${config.maxProjectsPerUser === 1 ? '' : 's'}. Open your existing site or start it over from a template.`);
    }
    const id = newId('prj', 9);
    const n = String(name || 'My Website').trim().slice(0, 80) || 'My Website';
    db.prepare('INSERT INTO projects (id, user_id, name, template, files_json) VALUES (?, ?, ?, ?, ?)').run(id, userId, n, template, JSON.stringify(files));
    db.prepare('INSERT INTO project_versions (project_id, files_json, source, note) VALUES (?, ?, ?, ?)').run(id, JSON.stringify(files), 'template', `Started from “${template}” template`);
    return getProject(userId, id);
  });
}

/** Replace project files and record a version (for undo). */
export function saveFiles(userId, projectId, files, { source, note }) {
  validateFiles(files);
  return tx(() => {
    getProject(userId, projectId); // ownership check
    const json = JSON.stringify(files);
    db.prepare("UPDATE projects SET files_json = ?, updated_at = datetime('now') WHERE id = ?").run(json, projectId);
    db.prepare('INSERT INTO project_versions (project_id, files_json, source, note) VALUES (?, ?, ?, ?)').run(projectId, json, source, note || null);
    db.prepare(`DELETE FROM project_versions WHERE project_id = ? AND id NOT IN
      (SELECT id FROM project_versions WHERE project_id = ? ORDER BY id DESC LIMIT ?)`).run(projectId, projectId, MAX_VERSIONS);
    return getProject(userId, projectId);
  });
}

export function resetFromTemplate(userId, projectId, template) {
  const p = getProject(userId, projectId);
  const files = buildTemplate(template, { brand: p.name });
  if (!files) throw new HttpError(400, 'invalid_template', 'Unknown template.');
  db.prepare('UPDATE projects SET template = ? WHERE id = ?').run(template, projectId);
  return saveFiles(userId, projectId, files, { source: 'template', note: `Started over from “${template}” template` });
}

export function renameProject(userId, projectId, name) {
  getProject(userId, projectId);
  const n = String(name || '').trim().slice(0, 80);
  if (!n) throw new HttpError(400, 'invalid_name', 'Name required.');
  db.prepare("UPDATE projects SET name = ?, updated_at = datetime('now') WHERE id = ?").run(n, projectId);
  return getProject(userId, projectId);
}

export function listVersions(userId, projectId) {
  getProject(userId, projectId);
  return db.prepare('SELECT id, source, note, created_at FROM project_versions WHERE project_id = ? ORDER BY id DESC').all(projectId);
}

export function restoreVersion(userId, projectId, versionId) {
  getProject(userId, projectId);
  const v = db.prepare('SELECT * FROM project_versions WHERE id = ? AND project_id = ?').get(versionId, projectId);
  if (!v) throw new HttpError(404, 'not_found', 'Version not found.');
  return saveFiles(userId, projectId, JSON.parse(v.files_json), { source: 'restore', note: `Restored version from ${v.created_at}` });
}

export function addChatMessage(projectId, { role, content, operation = null, credits = null, status = 'ok' }) {
  db.prepare('INSERT INTO chat_messages (project_id, role, content, operation, credits, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(projectId, role, content, operation, credits, status);
}

export function chatHistory(projectId, limit = 100) {
  return db.prepare(`SELECT * FROM (SELECT id, role, content, operation, credits, status, created_at FROM chat_messages
    WHERE project_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC`).all(projectId, limit);
}
