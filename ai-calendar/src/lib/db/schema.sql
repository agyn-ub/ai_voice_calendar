-- SQLite schema for calendar connections
CREATE TABLE IF NOT EXISTS calendar_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL UNIQUE,
  google_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for faster lookups by wallet address
CREATE INDEX IF NOT EXISTS idx_wallet_address ON calendar_connections(wallet_address);