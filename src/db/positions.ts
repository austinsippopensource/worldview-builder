import { getDB } from './schema';
import type { Position } from '../types';

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const PositionsDB = {
  upsert(topic: string, category: string, statement: string): Position {
    const db = getDB();
    const found = db.execute('SELECT id FROM positions WHERE topic = ?', [topic]);
    const existing = (found.rows ?? [])[0] as any;
    const now = Date.now();
    if (existing) {
      db.execute('UPDATE positions SET statement = ?, updated_at = ? WHERE topic = ?', [statement, now, topic]);
      return { id: existing.id, topic, category, statement, updatedAt: now };
    }
    const id = uuid();
    db.execute(
      'INSERT INTO positions (id, topic, category, statement, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, topic, category, statement, now],
    );
    return { id, topic, category, statement, updatedAt: now };
  },

  get(topic: string): Position | null {
    const result = getDB().execute('SELECT * FROM positions WHERE topic = ?', [topic]);
    const row = (result.rows ?? [])[0] as any;
    if (!row) return null;
    return { id: row.id, topic: row.topic, category: row.category, statement: row.statement ?? null, updatedAt: row.updated_at };
  },

  getAll(): Position[] {
    const result = getDB().execute('SELECT * FROM positions');
    return (result.rows ?? []).map((row: any) => ({
      id: row.id,
      topic: row.topic,
      category: row.category,
      statement: row.statement ?? null,
      updatedAt: row.updated_at,
    }));
  },
};
