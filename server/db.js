'use strict';

const Database = require('better-sqlite3');
const path = require('path');

/**
 * Open (and lazily create) the SQLite database. The schema is created
 * idempotently so the same call site works for production and tests.
 *
 * @param {string} [filename] absolute filename, or ":memory:" for tests
 */
function openDb(filename) {
  const file = filename || process.env.DB_FILE || path.join(__dirname, 'data.db');
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      company      TEXT    NOT NULL,
      role         TEXT    NOT NULL,
      location     TEXT    NOT NULL DEFAULT 'Hong Kong',
      salary_min   INTEGER,
      salary_max   INTEGER,
      status       TEXT    NOT NULL DEFAULT 'Applied'
                           CHECK (status IN ('Applied','Interview','Offer','Rejected')),
      notes        TEXT,
      applied_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_applied_at ON jobs(applied_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_company    ON jobs(company);
  `);

  return db;
}

module.exports = { openDb };
