/**
 * Tests for the Settings module (AsyncStorage wrappers).
 *
 * The AsyncStorage mock in __mocks__/ is an in-memory store. We reset it
 * before each test so values don't leak between tests.
 */

import { Settings } from '../../src/storage/settings';

const mockAsyncStorage = require('@react-native-async-storage/async-storage');

beforeEach(() => {
  mockAsyncStorage.__reset();
  jest.clearAllMocks();
});

describe('Settings.getModelPath / setModelPath', () => {
  test('returns null before any path is set', async () => {
    const path = await Settings.getModelPath();
    expect(path).toBeNull();
  });

  test('persists and retrieves the model path', async () => {
    await Settings.setModelPath('/documents/gemma-4-e4b-q4_k_m.gguf');
    const path = await Settings.getModelPath();
    expect(path).toBe('/documents/gemma-4-e4b-q4_k_m.gguf');
  });

  test('overwrites the previous path on a second set', async () => {
    await Settings.setModelPath('/old/model.gguf');
    await Settings.setModelPath('/new/model.gguf');
    expect(await Settings.getModelPath()).toBe('/new/model.gguf');
  });
});

describe('Settings.getBraveApiKey / setBraveApiKey', () => {
  test('returns null before any key is set', async () => {
    const key = await Settings.getBraveApiKey();
    expect(key).toBeNull();
  });

  test('persists and retrieves the Brave API key', async () => {
    await Settings.setBraveApiKey('BSA-test-key-12345');
    const key = await Settings.getBraveApiKey();
    expect(key).toBe('BSA-test-key-12345');
  });

  test('model path and API key are stored independently', async () => {
    await Settings.setModelPath('/path/to/model.gguf');
    await Settings.setBraveApiKey('BSA-key');
    expect(await Settings.getModelPath()).toBe('/path/to/model.gguf');
    expect(await Settings.getBraveApiKey()).toBe('BSA-key');
  });
});
