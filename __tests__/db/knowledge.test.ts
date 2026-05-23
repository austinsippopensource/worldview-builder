/**
 * Tests for KnowledgeDB — saved quotes and passages from the AI or web.
 */

import { initDB } from '../../src/db/schema';
import { KnowledgeDB } from '../../src/db/knowledge';

const mockSQLite = require('@op-engineering/op-sqlite');

beforeEach(() => {
  mockSQLite.__reset();
  initDB();
});

describe('KnowledgeDB.add', () => {
  test('stores an entry and returns a KnowledgeEntry object', () => {
    const entry = KnowledgeDB.add('Free markets allocate resources efficiently.', 'supporting');
    expect(entry.content).toBe('Free markets allocate resources efficiently.');
    expect(entry.stance).toBe('supporting');
    expect(entry.themeIds).toEqual([]);
    expect(entry.author).toBeUndefined();
    expect(entry.sourceUrl).toBeUndefined();
    expect(typeof entry.id).toBe('string');
    expect(typeof entry.createdAt).toBe('number');
  });

  test('stores optional author, sourceUrl, and themeIds', () => {
    const entry = KnowledgeDB.add('The communist manifesto excerpt', 'challenging', {
      author: 'Karl Marx',
      sourceUrl: 'https://marxists.org',
      themeIds: ['theme-1', 'theme-2'],
    });
    expect(entry.author).toBe('Karl Marx');
    expect(entry.sourceUrl).toBe('https://marxists.org');
    expect(entry.themeIds).toEqual(['theme-1', 'theme-2']);
  });

  test('accepts "challenging" stance', () => {
    const entry = KnowledgeDB.add('Counterargument text', 'challenging');
    expect(entry.stance).toBe('challenging');
  });

  test('themeIds round-trips through JSON serialisation', () => {
    const entry = KnowledgeDB.add('Quote', 'supporting', { themeIds: ['a', 'b', 'c'] });
    const fetched = KnowledgeDB.getAll();
    expect(fetched[0].themeIds).toEqual(['a', 'b', 'c']);
  });
});

describe('KnowledgeDB.getByStance', () => {
  test('returns only supporting entries', () => {
    KnowledgeDB.add('For it', 'supporting');
    KnowledgeDB.add('Against it', 'challenging');
    KnowledgeDB.add('Also for it', 'supporting');

    const supporting = KnowledgeDB.getByStance('supporting');
    expect(supporting).toHaveLength(2);
    supporting.forEach(e => expect(e.stance).toBe('supporting'));
  });

  test('returns only challenging entries', () => {
    KnowledgeDB.add('For', 'supporting');
    KnowledgeDB.add('Against A', 'challenging');
    KnowledgeDB.add('Against B', 'challenging');

    const challenging = KnowledgeDB.getByStance('challenging');
    expect(challenging).toHaveLength(2);
    challenging.forEach(e => expect(e.stance).toBe('challenging'));
  });

  test('returns empty array when no entries match the stance', () => {
    KnowledgeDB.add('For', 'supporting');
    expect(KnowledgeDB.getByStance('challenging')).toEqual([]);
  });
});

describe('KnowledgeDB.getAll', () => {
  test('returns empty array initially', () => {
    expect(KnowledgeDB.getAll()).toEqual([]);
  });

  test('returns entries of both stances', () => {
    KnowledgeDB.add('For', 'supporting');
    KnowledgeDB.add('Against', 'challenging');
    expect(KnowledgeDB.getAll()).toHaveLength(2);
  });

  test('maps null author/sourceUrl to undefined in the returned object', () => {
    KnowledgeDB.add('Quote', 'supporting');
    const [entry] = KnowledgeDB.getAll();
    expect(entry.author).toBeUndefined();
    expect(entry.sourceUrl).toBeUndefined();
  });
});

describe('KnowledgeDB.delete', () => {
  test('removes the entry by id', () => {
    const a = KnowledgeDB.add('Keep', 'supporting');
    const b = KnowledgeDB.add('Delete me', 'challenging');
    KnowledgeDB.delete(b.id);
    const all = KnowledgeDB.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(a.id);
  });

  test('is a no-op for an unknown id', () => {
    KnowledgeDB.add('Stays', 'supporting');
    KnowledgeDB.delete('ghost-id');
    expect(KnowledgeDB.getAll()).toHaveLength(1);
  });
});
