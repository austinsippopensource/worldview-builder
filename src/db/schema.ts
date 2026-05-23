/**
 * SQLite database initialisation and singleton connection.
 *
 * All data lives in a single file ("worldview.db") on the device's local
 * storage. This module is responsible for:
 *   1. Opening (or creating) that file via op-sqlite.
 *   2. Creating every table the app needs the first time the app runs.
 *
 * Other DB modules (conversations.ts, worldview.ts, knowledge.ts) call
 * getDB() to obtain the shared connection rather than opening their own.
 */

import { open } from '@op-engineering/op-sqlite';

const DB_NAME = 'worldview.db';

// Module-level singleton — only one connection is opened for the app's lifetime.
let db: ReturnType<typeof open> | null = null;

/** Returns the shared database connection, opening it on the first call. */
export function getDB() {
  if (!db) {
    db = open({ name: DB_NAME });
  }
  return db;
}

/**
 * Creates all tables if they don't already exist.
 * Called once from App.tsx when the app starts.
 * Safe to call multiple times — IF NOT EXISTS means nothing happens if tables exist.
 */
export function initDB() {
  const database = getDB();

  // Raw text inputs the user has pasted or added from conversations/web.
  // These are the "raw material" before the AI distils them into themes.
  database.execute(`
    CREATE TABLE IF NOT EXISTS raw_inputs (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'user',
      source_url TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // AI-extracted worldview themes — the living document of the user's beliefs.
  // The distiller mode writes to this table by emitting <theme> JSON blocks.
  database.execute(`
    CREATE TABLE IF NOT EXISTS worldview_themes (
      id TEXT PRIMARY KEY,
      theme TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Full conversation sessions. Messages are stored as a JSON-serialised array
  // in the `messages` column rather than a separate messages table — this keeps
  // queries simple and the whole history loads in one SELECT.
  database.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Saved quotes, passages, and arguments from the AI or web search results.
  // Each entry is tagged with a stance (supporting/challenging) and can be
  // linked to specific worldview themes via a JSON array of theme IDs.
  database.execute(`
    CREATE TABLE IF NOT EXISTS knowledge_entries (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      author TEXT,
      source_url TEXT,
      theme_ids TEXT NOT NULL DEFAULT '[]',
      stance TEXT NOT NULL DEFAULT 'supporting',
      created_at INTEGER NOT NULL
    )
  `);
}
