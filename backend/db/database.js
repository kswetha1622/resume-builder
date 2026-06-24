/**
 * db/database.js
 * SQLite initialisation and shared helper using better-sqlite3.
 * Creates two tables:
 *   - users  : stores email-based accounts (optional email)
 *   - resumes: stores the latest resume JSON per user
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// Place the DB file in /db/ alongside this file
const DB_DIR  = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'resume_builder.db');

let db;

/**
 * Opens (or creates) the SQLite database and runs migrations.
 */
function initDB() {
  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      email      TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data        TEXT NOT NULL,          -- JSON blob
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
  `);

  console.log('📦  SQLite database ready at', DB_PATH);
}

/** Returns the open DB instance (call initDB first) */
function getDB() {
  if (!db) throw new Error('Database not initialised. Call initDB() first.');
  return db;
}

module.exports = { initDB, getDB };
