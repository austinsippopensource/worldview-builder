/**
 * Tests for WorldviewDB — raw inputs and worldview themes.
 */

import { initDB } from '../../src/db/schema';
import { WorldviewDB } from '../../src/db/worldview';

const mockSQLite = require('@op-engineering/op-sqlite');

beforeEach(() => {
  mockSQLite.__reset();
  initDB();
});

// ── Raw inputs ────────────────────────────────────────────────────────────────

describe('WorldviewDB.addRawInput', () => {
  test('stores a user input and returns a RawInput object', () => {
    const input = WorldviewDB.addRawInput('I believe individual liberty is paramount.', 'user');
    expect(input.content).toBe('I believe individual liberty is paramount.');
    expect(input.source).toBe('user');
    expect(input.sourceUrl).toBeUndefined();
    expect(typeof input.id).toBe('string');
    expect(typeof input.createdAt).toBe('number');
  });

  test('stores web inputs with a sourceUrl', () => {
    const input = WorldviewDB.addRawInput('Article excerpt', 'web', 'https://example.com/article');
    expect(input.source).toBe('web');
    expect(input.sourceUrl).toBe('https://example.com/article');
  });

  test('defaults source to "user" when not provided', () => {
    const input = WorldviewDB.addRawInput('Some thought');
    expect(input.source).toBe('user');
  });
});

describe('WorldviewDB.getAllRawInputs', () => {
  test('returns empty array when no inputs exist', () => {
    expect(WorldviewDB.getAllRawInputs()).toEqual([]);
  });

  test('returns all stored inputs', () => {
    WorldviewDB.addRawInput('First', 'user');
    WorldviewDB.addRawInput('Second', 'web', 'https://x.com');
    const all = WorldviewDB.getAllRawInputs();
    expect(all).toHaveLength(2);
  });

  test('maps sourceUrl correctly (null in DB becomes undefined in the object)', () => {
    WorldviewDB.addRawInput('No URL', 'user');
    const [entry] = WorldviewDB.getAllRawInputs();
    expect(entry.sourceUrl).toBeUndefined();
  });
});

describe('WorldviewDB.deleteRawInput', () => {
  test('removes the entry by id', () => {
    const a = WorldviewDB.addRawInput('Keep', 'user');
    const b = WorldviewDB.addRawInput('Delete me', 'user');
    WorldviewDB.deleteRawInput(b.id);
    const all = WorldviewDB.getAllRawInputs();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(a.id);
  });

  test('is a no-op for an unknown id', () => {
    WorldviewDB.addRawInput('Stays', 'user');
    WorldviewDB.deleteRawInput('nonexistent');
    expect(WorldviewDB.getAllRawInputs()).toHaveLength(1);
  });
});

// ── Worldview themes ──────────────────────────────────────────────────────────

describe('WorldviewDB.upsertTheme — INSERT path', () => {
  test('creates a new theme with generated id when no id arg is provided', () => {
    const theme = WorldviewDB.upsertTheme('Liberty', 'Individual freedom matters most');
    expect(theme.theme).toBe('Liberty');
    expect(theme.content).toBe('Individual freedom matters most');
    expect(typeof theme.id).toBe('string');
    expect(typeof theme.updatedAt).toBe('number');
  });

  test('creates two separate themes when called twice without id', () => {
    const a = WorldviewDB.upsertTheme('Theme A', 'Content A');
    const b = WorldviewDB.upsertTheme('Theme B', 'Content B');
    expect(a.id).not.toBe(b.id);
    expect(WorldviewDB.getAllThemes()).toHaveLength(2);
  });
});

describe('WorldviewDB.upsertTheme — UPDATE path', () => {
  test('updates an existing theme when a matching id is provided', () => {
    const original = WorldviewDB.upsertTheme('Liberty', 'Original content');
    const updated = WorldviewDB.upsertTheme('Liberty Revised', 'Updated content', original.id);

    expect(updated.id).toBe(original.id);
    expect(updated.theme).toBe('Liberty Revised');
    expect(updated.content).toBe('Updated content');
  });

  test('does not create a duplicate row on update', () => {
    const t = WorldviewDB.upsertTheme('Theme', 'Content');
    WorldviewDB.upsertTheme('Theme Changed', 'Content Changed', t.id);
    expect(WorldviewDB.getAllThemes()).toHaveLength(1);
  });

  test('creates a new theme (INSERT) when the provided id does not match any row', () => {
    const t = WorldviewDB.upsertTheme('New Theme', 'Content', 'unknown-id');
    expect(t.theme).toBe('New Theme');
    expect(WorldviewDB.getAllThemes()).toHaveLength(1);
  });
});

describe('WorldviewDB.getAllThemes', () => {
  test('returns empty array when no themes exist', () => {
    expect(WorldviewDB.getAllThemes()).toEqual([]);
  });

  test('returns all themes', () => {
    WorldviewDB.upsertTheme('A', 'Content A');
    WorldviewDB.upsertTheme('B', 'Content B');
    expect(WorldviewDB.getAllThemes()).toHaveLength(2);
  });
});

describe('WorldviewDB.deleteTheme', () => {
  test('removes the theme by id', () => {
    const t = WorldviewDB.upsertTheme('To Remove', 'Content');
    WorldviewDB.deleteTheme(t.id);
    expect(WorldviewDB.getAllThemes()).toHaveLength(0);
  });
});
