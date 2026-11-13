import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-test-ai-'));
process.env.PAYMENT_PROVIDER = 'test';
process.env.AI_PROVIDER = 'mock';

let parse, ai, db, credits, projects;
before(async () => {
  parse = await import('../src/ai/parse.js');
  ai = await import('../src/ai/index.js');
  ({ db } = await import('../src/db.js'));
  credits = await import('../src/credits.js');
  projects = await import('../src/projects.js');
});

function userWithCredits(amount) {
  const id = Number(db.prepare('INSERT INTO users (email, name, password_hash, credits) VALUES (?, ?, ?, ?)')
    .run(`ai${Math.random()}@t.co`, 'U', 'x', amount).lastInsertRowid);
  const p = projects.createProject(id, { name: 'Site', template: 'business' });
  return { user: { id }, project: p };
}

test('parser extracts message, files and deletes', () => {
  const out = parse.parseAiOutput('<message>\nHello\n</message>\n<file path="index.html">\n<h1>x</h1>\n</file>\n<file path="assets/a.svg">\n<svg/>\n</file>\n<delete path="old.html"/><delete path="index.html"/>');
  assert.equal(out.message, 'Hello');
  assert.deepEqual(Object.keys(out.files), ['index.html', 'assets/a.svg']);
  assert.equal(out.files['index.html'], '<h1>x</h1>');
  assert.deepEqual(out.deletes, ['old.html']); // index.html is protected
});

test('parser rejects path traversal and unsafe SVG', () => {
  assert.throws(() => parse.parseAiOutput('<message>x</message><file path="../server.js">x</file>'));
  const p = parse.parseAiOutput('<message>x</message><file path="assets/a.svg"><svg onload="alert(1)"/></file>');
  assert.throws(() => parse.applyChanges({ 'index.html': '' }, p));
});

test('streamView shows only the message text while streaming', () => {
  assert.deepEqual(parse.streamView('<message>\nHi the'), { message: 'Hi the', files: [] });
  assert.deepEqual(parse.streamView('<message>Done</message>\n<file path="styles.css">\n:root{'), { message: 'Done', files: ['styles.css'] });
});

test('successful AI operation charges the operation cost once and saves files', async () => {
  const { user, project } = userWithCredits(20);
  const events = [];
  const r = await ai.runOperation({ user, projectId: project.id, operationId: 'restyle', prompt: 'make it dark', emit: (e) => events.push(e) });
  assert.equal(r.charged, 2);
  assert.equal(credits.getBalance(user.id).credits, 18);
  assert.ok(r.changed.includes('styles.css'));
  assert.notEqual(projects.getProject(user.id, project.id).files['styles.css'], project.files['styles.css']);
  assert.ok(events.includes('start') && events.includes('text'));
});

test('failed AI operation charges nothing', async () => {
  const { user, project } = userWithCredits(20);
  await assert.rejects(ai.runOperation({ user, projectId: project.id, operationId: 'edit', prompt: 'simulate failure', emit: () => {} }));
  assert.deepEqual(credits.getBalance(user.id), { credits: 20, held: 0, available: 20 });
});

test('insufficient credits are refused before calling the AI', async () => {
  const { user, project } = userWithCredits(3);
  await assert.rejects(
    ai.runOperation({ user, projectId: project.id, operationId: 'create_site', prompt: 'a site', emit: () => assert.fail('must not start') }),
    (e) => e.status === 402,
  );
  assert.equal(credits.getBalance(user.id).credits, 3);
});

test('aborted AI operation charges nothing', async () => {
  const { user, project } = userWithCredits(20);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 50);
  await assert.rejects(ai.runOperation({ user, projectId: project.id, operationId: 'create_site', prompt: 'a cafe site', signal: ctrl.signal, emit: () => {} }));
  assert.deepEqual(credits.getBalance(user.id), { credits: 20, held: 0, available: 20 });
});

test('operation costs come from server config, not the client', async () => {
  const { user, project } = userWithCredits(100);
  await assert.rejects(ai.runOperation({ user, projectId: project.id, operationId: 'free_stuff', prompt: 'x', emit: () => {} }), (e) => e.status === 400);
});
