/**
 * CRUD operations for knowledge_entries.
 *
 * The knowledge base is a curated collection of quotes, passages, and arguments
 * that relate to the user's worldview. Entries can come from:
 *   - Long-pressing an AI message bubble (in any conversation screen)
 *   - Clicking "+ Add to knowledge base" on a web search result
 *
 * Every entry is tagged with a stance — 'supporting' means it reinforces the
 * user's worldview, 'challenging' means it pushes back against it. The
 * KnowledgeScreen lets the user browse and filter by stance.
 */

import { getDB } from './schema';
import type { KnowledgeEntry, KnowledgeStance } from '../types';

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const KnowledgeDB = {
  /**
   * Saves a new knowledge entry.
   *
   * @param content  The quote or passage text.
   * @param stance   'supporting' or 'challenging' — set by the calling screen
   *                 based on which AI mode the user was in when they saved it.
   * @param opts     Optional author, source URL, and theme IDs.
   */
  add(
    content: string,
    stance: KnowledgeStance,
    opts: { author?: string; sourceUrl?: string; themeIds?: string[] } = {},
  ): KnowledgeEntry {
    const db = getDB();
    const entry: KnowledgeEntry = {
      id: uuid(),
      content,
      author: opts.author,
      sourceUrl: opts.sourceUrl,
      themeIds: opts.themeIds ?? [],
      stance,
      createdAt: Date.now(),
    };
    db.execute(
      'INSERT INTO knowledge_entries (id, content, author, source_url, theme_ids, stance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        entry.id,
        entry.content,
        entry.author ?? null,            // store JS undefined as SQL NULL
        entry.sourceUrl ?? null,
        JSON.stringify(entry.themeIds),  // array serialised as JSON text
        entry.stance,
        entry.createdAt,
      ],
    );
    return entry;
  },

  /** Returns all entries with a given stance, newest first. */
  getByStance(stance: KnowledgeStance): KnowledgeEntry[] {
    const db = getDB();
    const result = db.execute(
      'SELECT * FROM knowledge_entries WHERE stance = ? ORDER BY created_at DESC',
      [stance],
    );
    return (result.rows ?? []).map((row: any) => ({
      id: row.id,
      content: row.content,
      author: row.author ?? undefined,
      sourceUrl: row.source_url ?? undefined,
      themeIds: JSON.parse(row.theme_ids),  // deserialise JSON back to array
      stance: row.stance,
      createdAt: row.created_at,
    }));
  },

  /** Returns all knowledge entries regardless of stance, newest first. */
  getAll(): KnowledgeEntry[] {
    const db = getDB();
    const result = db.execute('SELECT * FROM knowledge_entries ORDER BY created_at DESC');
    return (result.rows ?? []).map((row: any) => ({
      id: row.id,
      content: row.content,
      author: row.author ?? undefined,
      sourceUrl: row.source_url ?? undefined,
      themeIds: JSON.parse(row.theme_ids),
      stance: row.stance,
      createdAt: row.created_at,
    }));
  },

  /** Deletes a knowledge entry by ID. */
  delete(id: string) {
    getDB().execute('DELETE FROM knowledge_entries WHERE id = ?', [id]);
  },
};
