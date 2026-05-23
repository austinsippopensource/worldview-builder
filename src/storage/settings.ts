/**
 * Persistent key-value settings using AsyncStorage.
 *
 * AsyncStorage is React Native's simple, asynchronous, unencrypted key-value
 * store — similar to localStorage in a web browser, but on the device file
 * system. It survives app restarts but is cleared when the app is uninstalled.
 *
 * We store:
 *   model_path   — absolute path to the GGUF file so it can be auto-loaded
 *                  on the next app launch without asking the user again
 *   brave_api_key — the user's Brave Search API key for web search
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Centralised key names prevent typos when reading vs writing the same setting
const KEYS = {
  MODEL_PATH: 'model_path',
  BRAVE_API_KEY: 'brave_api_key',
} as const;

export const Settings = {
  /** Returns the saved model file path, or null if no model has been loaded yet. */
  async getModelPath(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.MODEL_PATH);
  },

  /** Saves the model file path so the app can auto-load it on next launch. */
  async setModelPath(path: string): Promise<void> {
    return AsyncStorage.setItem(KEYS.MODEL_PATH, path);
  },

  /** Returns the saved Brave API key, or null if web search is not configured. */
  async getBraveApiKey(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.BRAVE_API_KEY);
  },

  /** Saves the Brave API key. Pass an empty string to effectively disable search. */
  async setBraveApiKey(key: string): Promise<void> {
    return AsyncStorage.setItem(KEYS.BRAVE_API_KEY, key);
  },
};
