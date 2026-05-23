/**
 * Tests for ConversationsDB.
 *
 * These tests run against the in-memory op-sqlite mock so no native build is
 * needed. Each test starts with a clean database (tables created, no rows).
 */

import { initDB } from '../../src/db/schema';
import { ConversationsDB } from '../../src/db/conversations';

const mockSQLite = require('@op-engineering/op-sqlite');

beforeEach(() => {
  // Wipe the in-memory store so each test starts with empty tables
  mockSQLite.__reset();
  // Re-run CREATE TABLE statements (they are IF NOT EXISTS so safe to call repeatedly)
  initDB();
});

describe('ConversationsDB.createConversation', () => {
  test('returns a Conversation with the requested mode and empty messages', () => {
    const convo = ConversationsDB.createConversation('distiller');
    expect(convo.mode).toBe('distiller');
    expect(convo.messages).toEqual([]);
    expect(typeof convo.id).toBe('string');
    expect(convo.id.length).toBeGreaterThan(0);
    expect(typeof convo.createdAt).toBe('number');
    expect(convo.createdAt).toBeGreaterThan(0);
  });

  test('generates unique IDs for each conversation', () => {
    const a = ConversationsDB.createConversation('advocate');
    const b = ConversationsDB.createConversation('advocate');
    expect(a.id).not.toBe(b.id);
  });

  test('supports all three AI modes', () => {
    const modes = ['distiller', 'advocate', 'challenger'] as const;
    modes.forEach(mode => {
      const convo = ConversationsDB.createConversation(mode);
      expect(convo.mode).toBe(mode);
    });
  });
});

describe('ConversationsDB.appendMessage', () => {
  test('adds a message and returns it with a generated id and timestamp', () => {
    const convo = ConversationsDB.createConversation('advocate');
    const msg = ConversationsDB.appendMessage(convo.id, { role: 'user', content: 'Hello' });

    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
    expect(typeof msg.id).toBe('string');
    expect(typeof msg.timestamp).toBe('number');
  });

  test('persists the message so it is retrievable via getConversation', () => {
    const convo = ConversationsDB.createConversation('challenger');
    ConversationsDB.appendMessage(convo.id, { role: 'user', content: 'Test message' });

    const fetched = ConversationsDB.getConversation(convo.id);
    expect(fetched?.messages).toHaveLength(1);
    expect(fetched?.messages[0].content).toBe('Test message');
  });

  test('accumulates multiple messages in order', () => {
    const convo = ConversationsDB.createConversation('distiller');
    ConversationsDB.appendMessage(convo.id, { role: 'user', content: 'First' });
    ConversationsDB.appendMessage(convo.id, { role: 'assistant', content: 'Second' });
    ConversationsDB.appendMessage(convo.id, { role: 'user', content: 'Third' });

    const fetched = ConversationsDB.getConversation(convo.id);
    expect(fetched?.messages).toHaveLength(3);
    expect(fetched?.messages[0].content).toBe('First');
    expect(fetched?.messages[2].content).toBe('Third');
  });

  test('throws a descriptive error for an unknown conversation id', () => {
    expect(() =>
      ConversationsDB.appendMessage('does-not-exist', { role: 'user', content: 'Hi' }),
    ).toThrow('Conversation does-not-exist not found');
  });
});

describe('ConversationsDB.getConversation', () => {
  test('returns null for an unknown id', () => {
    expect(ConversationsDB.getConversation('unknown')).toBeNull();
  });

  test('returns the full conversation object with correct field names', () => {
    const created = ConversationsDB.createConversation('distiller');
    const fetched = ConversationsDB.getConversation(created.id);

    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.mode).toBe('distiller');
    expect(Array.isArray(fetched!.messages)).toBe(true);
    expect(typeof fetched!.createdAt).toBe('number');
    expect(typeof fetched!.updatedAt).toBe('number');
  });
});

describe('ConversationsDB.getRecentByMode', () => {
  test('returns only conversations matching the given mode', () => {
    ConversationsDB.createConversation('distiller');
    ConversationsDB.createConversation('distiller');
    ConversationsDB.createConversation('advocate');

    const results = ConversationsDB.getRecentByMode('distiller', 10);
    expect(results).toHaveLength(2);
    results.forEach(c => expect(c.mode).toBe('distiller'));
  });

  test('respects the limit parameter', () => {
    ConversationsDB.createConversation('challenger');
    ConversationsDB.createConversation('challenger');
    ConversationsDB.createConversation('challenger');

    const results = ConversationsDB.getRecentByMode('challenger', 2);
    expect(results).toHaveLength(2);
  });

  test('returns an empty array when no conversations match the mode', () => {
    ConversationsDB.createConversation('distiller');
    const results = ConversationsDB.getRecentByMode('advocate', 5);
    expect(results).toEqual([]);
  });

  test('defaults limit to 1', () => {
    ConversationsDB.createConversation('distiller');
    ConversationsDB.createConversation('distiller');
    const results = ConversationsDB.getRecentByMode('distiller');
    expect(results).toHaveLength(1);
  });
});
