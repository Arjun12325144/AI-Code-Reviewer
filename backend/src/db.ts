import Database from 'better-sqlite3';
import path from 'path';
import { SessionRow, SessionListItem, ReviewResult } from './types';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'reviews.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      code TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'unknown',
      review TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON reviews(session_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_timestamp ON reviews(timestamp DESC);
  `);
}

export function createSession(sessionId: string): void {
  const database = getDb();
  database.prepare('INSERT OR IGNORE INTO sessions (id) VALUES (?)').run(sessionId);
}

export function saveReview(
  sessionId: string,
  code: string,
  language: string,
  review: ReviewResult
): void {
  const database = getDb();
  database.prepare(`
    INSERT INTO reviews (session_id, code, language, review, score, timestamp)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(sessionId, code, language, JSON.stringify(review), review.score);
}

export function getAllSessions(): SessionListItem[] {
  const database = getDb();
  const rows = database.prepare(`
    SELECT 
      r.session_id as id,
      r.language,
      r.timestamp,
      r.score,
      substr(r.code, 1, 100) as code_preview
    FROM reviews r
    INNER JOIN (
      SELECT session_id, MAX(timestamp) as max_ts
      FROM reviews
      GROUP BY session_id
    ) latest ON r.session_id = latest.session_id AND r.timestamp = latest.max_ts
    ORDER BY r.timestamp DESC
    LIMIT 100
  `).all() as SessionListItem[];
  return rows;
}

export function getSessionById(sessionId: string): SessionRow | null {
  const database = getDb();
  const row = database.prepare(`
    SELECT session_id as id, code, language, review, score, timestamp
    FROM reviews
    WHERE session_id = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `).get(sessionId) as SessionRow | undefined;
  return row || null;
}

export function deleteSession(sessionId: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  return result.changes > 0;
}
