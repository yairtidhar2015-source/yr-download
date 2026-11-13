import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

export const db = new DatabaseSync(config.dbFile);
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  -- credits = purchased-and-not-yet-spent; held = reserved by AI operations in flight
  credits       INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  held          INTEGER NOT NULL DEFAULT 0 CHECK (held >= 0),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (held <= credits)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  template   TEXT,
  files_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

CREATE TABLE IF NOT EXISTS project_versions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  files_json TEXT NOT NULL,
  source     TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_versions_project ON project_versions(project_id, id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  operation  TEXT,
  credits    INTEGER,
  status     TEXT NOT NULL DEFAULT 'ok',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_project ON chat_messages(project_id, id);

CREATE TABLE IF NOT EXISTS credit_holds (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  amount     INTEGER NOT NULL CHECK (amount > 0),
  operation  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','captured','released')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  settled_at TEXT
);

CREATE TABLE IF NOT EXISTS purchases (
  id                  TEXT PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id),
  package_id          TEXT NOT NULL,
  credits             INTEGER NOT NULL CHECK (credits > 0),
  amount_minor        INTEGER NOT NULL CHECK (amount_minor > 0),
  currency            TEXT NOT NULL,
  provider            TEXT NOT NULL,
  provider_order_id   TEXT,
  provider_capture_id TEXT,
  status              TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed','refunded')),
  test                INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at             TEXT,
  UNIQUE (provider, provider_order_id)
);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);

-- Append-only ledger. (kind, reference) is unique so the same purchase / hold /
-- refund can never be booked twice, no matter how many times a webhook repeats.
CREATE TABLE IF NOT EXISTS credit_transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  kind          TEXT NOT NULL CHECK (kind IN ('purchase','ai_usage','refund','adjustment')),
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  description   TEXT NOT NULL,
  reference     TEXT NOT NULL,
  test          INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (kind, reference)
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON credit_transactions(user_id, id);

CREATE TABLE IF NOT EXISTS webhook_events (
  provider    TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  event_type  TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (provider, event_id)
);

CREATE TABLE IF NOT EXISTS uploads (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename   TEXT NOT NULL,
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

/** Run fn inside a write transaction (BEGIN IMMEDIATE). Rolls back on throw. */
export function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
