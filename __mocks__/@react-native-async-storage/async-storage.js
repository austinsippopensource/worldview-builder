/**
 * In-memory mock for @react-native-async-storage/async-storage.
 * Call __reset() in beforeEach to clear stored data between tests.
 */

const store = new Map();

module.exports = {
  getItem: jest.fn(key => Promise.resolve(store.has(key) ? store.get(key) : null)),
  setItem: jest.fn((key, value) => { store.set(key, value); return Promise.resolve(); }),
  removeItem: jest.fn(key => { store.delete(key); return Promise.resolve(); }),
  clear: jest.fn(() => { store.clear(); return Promise.resolve(); }),
  getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
  multiGet: jest.fn(keys => Promise.resolve(keys.map(k => [k, store.get(k) ?? null]))),
  multiSet: jest.fn(pairs => { pairs.forEach(([k, v]) => store.set(k, v)); return Promise.resolve(); }),
  __reset: () => store.clear(),
};
