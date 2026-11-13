// User image uploads (free feature). Only raster images whose bytes match
// their type are accepted; SVG uploads are refused (they can carry scripts).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from './db.js';
import { config } from './config.js';
import { HttpError } from './util.js';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_UPLOADS_PER_USER = 100;

const SIGNATURES = [
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/gif', ext: 'gif', test: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
];

export function saveUpload(userId, buffer, originalName) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new HttpError(400, 'empty_upload', 'No image received.');
  if (buffer.length > MAX_UPLOAD_BYTES) throw new HttpError(413, 'too_large', 'Images must be 5 MB or smaller.');
  const kind = SIGNATURES.find((s) => s.test(buffer));
  if (!kind) throw new HttpError(415, 'unsupported_type', 'Please upload a PNG, JPG, GIF or WebP image.');
  const count = db.prepare('SELECT COUNT(*) AS n FROM uploads WHERE user_id = ?').get(userId).n;
  if (count >= MAX_UPLOADS_PER_USER) throw new HttpError(403, 'upload_limit', `You can store up to ${MAX_UPLOADS_PER_USER} images.`);

  const id = `${crypto.randomBytes(16).toString('hex')}.${kind.ext}`;
  fs.writeFileSync(path.join(config.uploadsDir, id), buffer);
  const filename = String(originalName || 'image').replace(/[^\w.\- ]+/g, '').slice(0, 80) || 'image';
  db.prepare('INSERT INTO uploads (id, user_id, filename, mime, size) VALUES (?, ?, ?, ?, ?)').run(id, userId, filename, kind.mime, buffer.length);
  return { id, url: `/u/${id}`, filename, size: buffer.length };
}

export function listUploads(userId) {
  return db.prepare('SELECT id, filename, size, created_at FROM uploads WHERE user_id = ? ORDER BY created_at DESC').all(userId)
    .map((u) => ({ ...u, url: `/u/${u.id}` }));
}

export function uploadMime(id) {
  if (!/^[a-f0-9]{32}\.(png|jpg|gif|webp)$/.test(id)) return null;
  return db.prepare('SELECT mime FROM uploads WHERE id = ?').get(id)?.mime || null;
}
