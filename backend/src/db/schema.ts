import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', '..', 'securevault.db');

let db: Database.Database;

export function getDB(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDB(): void {
  const database = getDB();

  database.exec(`
    CREATE TABLE IF NOT EXISTS master_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_name TEXT NOT NULL,
      site_url TEXT NOT NULL DEFAULT '',
      username TEXT NOT NULL,
      encrypted_password TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      breach_status TEXT NOT NULL DEFAULT 'unknown' CHECK (breach_status IN ('safe', 'compromised', 'unknown')),
      pwned_count INTEGER DEFAULT 0,
      last_scanned TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: Add pwned_count column if it doesn't exist
  try {
    database.exec(`ALTER TABLE credentials ADD COLUMN pwned_count INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }

  console.log('[DB] SQLite tables initialized');
}
