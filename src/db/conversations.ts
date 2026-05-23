/**
 * CRUD operations for the conversations table.
 *
 * Each conversation belongs to one AI mode (distiller / advocate / challenger)
 * and holds its entire message history as a JSON array in a single column.
 * This avoids a separate messages table and keeps conversation loading simple.
 */

import { getDB } from './schema';
import type { Conversation, Message, AIMode } from '../types';

/** Generates a short random ID from base-36 chars + a timestamp suffix. */
function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const ConversationsDB = {
  /**
   * Creates a new empty conversation for the given AI mode, persists it, and
   * returns the full object so the caller can start appending messages.
   */
  createConversation(mode: AIMode): Conversation {
    const db = getDB();
    const now = Date.now();
    const convo: Conversation = {
      id: uuid(),
      mode,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    db.execute(
      'INSERT INTO conversations (id, mode, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [convo.id, convo.mode, '[]', convo.createdAt, convo.updatedAt],
    );
    return convo;
  },

  /**
   * Appends a message to an existing conversation.
   *
   * The whole messages array is read, the new message is pushed onto it, and
   * the array is written back as JSON. SQLite doesn't natively support JSON
   * array appends, so we do the read-modify-write in JS.
   *
   * Throws if the conversation ID doesn't exist — callers should ensure the
   * conversation was created before calling this.
   */
  appendMessage(conversationId: string, message: Omit<Message, 'id' | 'timestamp'>): Message {
    const db = getDB();
    const msg: Message = {
      id: uuid(),
      role: message.role,
      content: message.content,
      timestamp: Date.now(),
    };

    // Read the current messages blob
    const result = db.execute('SELECT messages FROM conversations WHERE id = ?', [conversationId]);
    const row = (result.rows ?? [])[0];
    if (!row) throw new Error(`Conversation ${conversationId} not found`);

    const messages: Message[] = JSON.parse(row.messages);
    messages.push(msg);

    // Write the updated array back and bump updated_at
    db.execute('UPDATE conversations SET messages = ?, updated_at = ? WHERE id = ?', [
      JSON.stringify(messages),
      Date.now(),
      conversationId,
    ]);
    return msg;
  },

  /** Fetches a single conversation by ID, or returns null if not found. */
  getConversation(id: string): Conversation | null {
    const db = getDB();
    const result = db.execute('SELECT * FROM conversations WHERE id = ?', [id]);
    const row = (result.rows ?? [])[0];
    if (!row) return null;
    return {
      id: row.id,
      mode: row.mode,
      messages: JSON.parse(row.messages),  // deserialise the JSON blob back to an array
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Returns up to `limit` most-recently-updated conversations for a given mode.
   * Used by screens to resume the last conversation when the user switches tabs.
   */
  getRecentByMode(mode: AIMode, limit = 1): Conversation[] {
    const db = getDB();
    const result = db.execute(
      'SELECT * FROM conversations WHERE mode = ? ORDER BY updated_at DESC LIMIT ?',
      [mode, limit],
    );
    return (result.rows ?? []).map((row: any) => ({
      id: row.id,
      mode: row.mode,
      messages: JSON.parse(row.messages),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },
};
