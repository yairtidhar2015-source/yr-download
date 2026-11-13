import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';
import { config } from './config.js';
import { HttpError, sha256 } from './util.js';

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'sf_session';
const SCRYPT = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, saltHex, keyHex] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), 64, SCRYPT);
  const expected = Buffer.from(keyHex, 'hex');
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
}

export function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + config.sessionDays * 864e5);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, expires.toISOString());
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.isProd, expires, path: '/' });
}

export function destroySession(req, res) {
  const token = readCookie(req, COOKIE);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.clearCookie(COOKIE, { path: '/' });
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

const sessionLookup = db.prepare(`SELECT u.id, u.email, u.name, u.credits, u.held FROM sessions s
  JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`);

/** Attaches req.user when a valid session cookie is present. */
export function sessionMiddleware(req, _res, next) {
  const token = readCookie(req, COOKIE);
  req.user = token ? sessionLookup.get(sha256(token), new Date().toISOString()) || null : null;
  next();
}

export function requireUser(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'unauthorized', 'Please log in.'));
  next();
}

export function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, credits: u.credits - u.held };
}

export function validateSignup({ email, password, name }) {
  email = String(email || '').trim().toLowerCase();
  name = String(name || '').trim().slice(0, 80);
  password = String(password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new HttpError(400, 'invalid_email', 'Please enter a valid email address.');
  if (password.length < 8 || password.length > 200) throw new HttpError(400, 'weak_password', 'Password must be at least 8 characters.');
  return { email, password, name: name || email.split('@')[0] };
}
