import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.js';

const file = process.env.PRICING_FILE || path.join(ROOT, 'config', 'pricing.json');
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));

function assert(cond, msg) { if (!cond) throw new Error(`[pricing] ${msg}`); }

assert(/^[A-Z]{3}$/.test(raw.currency), 'currency must be an ISO code');
assert(Array.isArray(raw.packages) && raw.packages.length, 'packages required');
const ids = new Set();
for (const p of raw.packages) {
  assert(/^[a-z0-9_-]+$/.test(p.id) && !ids.has(p.id), `bad/duplicate package id ${p.id}`);
  ids.add(p.id);
  assert(Number.isInteger(p.credits) && p.credits > 0, `credits for ${p.id}`);
  assert(typeof p.price === 'number' && p.price > 0, `price for ${p.id}`);
}
for (const [k, op] of Object.entries(raw.operations)) {
  assert(/^[a-z_]+$/.test(k), `bad operation id ${k}`);
  assert(Number.isInteger(op.credits) && op.credits > 0, `credits for operation ${k}`);
}

export const pricing = {
  currency: raw.currency,
  currencySymbol: raw.currencySymbol || raw.currency,
  packages: raw.packages.map((p) => ({ ...p, priceMinor: Math.round(p.price * 100) })),
  operations: raw.operations,
};

export const getPackage = (id) => pricing.packages.find((p) => p.id === id) || null;
export const getOperation = (id) => (Object.hasOwn(pricing.operations, id) ? { id, ...pricing.operations[id] } : null);
export const formatMinor = (minor) => (minor / 100).toFixed(2);
