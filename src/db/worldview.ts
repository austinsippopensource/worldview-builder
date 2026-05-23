/**
 * CRUD operations for raw_inputs and worldview_themes tables.
 *
 * raw_inputs: text the user has pasted in before it has been processed.
 * worldview_themes: the AI-distilled beliefs/values extracted from those inputs.
 *
 * The distiller (useAgenticChat + distillerSystemPrompt) writes themes by
 * emitting <theme> JSON blocks in its responses. The WorldviewScreen parses
 * those blocks and calls upsertTheme() to persist them.
 */

import { getDB } from './schema';
import type { RawInput, WorldviewTheme, InputSource } from '../types';

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const WorldviewDB = {
  // ── Raw inputs ──────────────────────────────────────────────────────────────

  /**
   * Saves a piece of raw text. source tells us where it came from
   * ('user' = typed/pasted, 'web' = from a search result, 'conversation' = from a chat).
   */
  addRawInput(content: string, source: InputSource = 'user', sourceUrl?: string): RawInput {
    const db = getDB();
    const entry: RawInput = {
      id: uuid(),
      content,
      source,
      sourceUrl,
      createdAt: Date.now(),
    };
    db.execute(
      'INSERT INTO raw_inputs (id, content, source, source_url, created_at) VALUES (?, ?, ?, ?, ?)',
      [entry.id, entry.content, entry.source, entry.sourceUrl ?? null, entry.createdAt],
    );
    return entry;
  },

  /** Returns all raw inputs, newest first. */
  getAllRawInputs(): RawInput[] {
    const db = getDB();
    const result = db.execute('SELECT * FROM raw_inputs ORDER BY created_at DESC');
    return (result.rows ?? []).map((row: any) => ({
      id: row.id,
      content: row.content,
      source: row.source,
      sourceUrl: row.source_url ?? undefined,  // SQLite NULL → JS undefined
      createdAt: row.created_at,
    }));
  },

  /** Deletes one raw input by ID. */
  deleteRawInput(id: string) {
    getDB().execute('DELETE FROM raw_inputs WHERE id = ?', [id]);
  },

  // ── Worldview themes ────────────────────────────────────────────────────────

  /**
   * Creates or updates a worldview theme.
   *
   * If `id` is provided and matches an existing row, that row is updated (UPDATE).
   * If `id` is omitted or doesn't match, a new row is created (INSERT).
   *
   * This is the "upsert" pattern: the distiller can keep refining a theme over
   * multiple conversations without creating duplicates. The AI emits the same
   * theme name to signal it wants to update an existing theme.
   */
  upsertTheme(theme: string, content: string, id?: string): WorldviewTheme {
    const db = getDB();

    // Try to look up an existing theme by the provided ID
    const existing = id
      ? (db.execute('SELECT * FROM worldview_themes WHERE id = ?', [id]).rows ?? [])[0]
      : null;

    const entry: WorldviewTheme = {
      id: existing?.id ?? uuid(),  // reuse existing id, or generate a new one
      theme,
      content,
      updatedAt: Date.now(),
    };

    if (existing) {
      db.execute(
        'UPDATE worldview_themes SET theme = ?, content = ?, updated_at = ? WHERE id = ?',
        [entry.theme, entry.content, entry.updatedAt, entry.id],
      );
    } else {
      db.execute(
        'INSERT INTO worldview_themes (id, theme, content, updated_at) VALUES (?, ?, ?, ?)',
        [entry.id, entry.theme, entry.content, entry.updatedAt],
      );
    }
    return entry;
  },

  /** Returns all worldview themes, most recently updated first. */
  getAllThemes(): WorldviewTheme[] {
    const db = getDB();
    const result = db.execute('SELECT * FROM worldview_themes ORDER BY updated_at DESC');
    return (result.rows ?? []).map((row: any) => ({
      id: row.id,
      theme: row.theme,
      content: row.content,
      updatedAt: row.updated_at,
    }));
  },

  /** Deletes a worldview theme by ID. */
  deleteTheme(id: string) {
    getDB().execute('DELETE FROM worldview_themes WHERE id = ?', [id]);
  },
};
