/**
 * App root — the entry point rendered by index.js.
 *
 * Startup sequence:
 *   1. App mounts → initDB() creates SQLite tables if they don't exist yet
 *   2. LlamaProvider sets up the on-device LLM context for all child screens
 *   3. AppContent checks AsyncStorage for a saved model path
 *      a. If a path is found → tries to load it automatically (fast re-launch)
 *      b. If loading fails (file deleted / moved) → falls through to setup screen
 *      c. If no path saved → immediately shows the setup screen
 *   4. Once a model is loaded, NavigationContainer + AppNavigator render the app
 *
 * Provider hierarchy (outermost → innermost):
 *   GestureHandlerRootView — required by react-native-gesture-handler for swipe/drag
 *   SafeAreaProvider       — notch/status bar safe area insets for all screens
 *   LlamaProvider          — on-device LLM context (model, complete, isLoading...)
 *   AppContent             — model-ready gate and navigation container
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDB } from './src/db/schema';
import { LlamaProvider, useLlama } from './src/llm/LlamaContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ModelSetupScreen } from './src/screens/ModelSetupScreen';
import { Settings } from './src/storage/settings';

/**
 * Sits inside LlamaProvider so it can call useLlama().
 * Acts as a gate: shows ModelSetupScreen until a model is loaded,
 * then shows the full navigation tree.
 */
function AppContent() {
  const [modelReady, setModelReady] = useState(false);
  const [checking, setChecking] = useState(true);  // true while we're checking AsyncStorage
  const { loadModel } = useLlama();

  useEffect(() => {
    async function tryLoadSavedModel() {
      const savedPath = await Settings.getModelPath();
      if (savedPath) {
        try {
          await loadModel(savedPath);
          setModelReady(true);
        } catch {
          // The saved path no longer points to a valid file (e.g. user cleared app storage).
          // Fall through to show the setup screen so they can pick a new model.
        }
      }
      setChecking(false);  // done checking — render whichever screen is appropriate
    }
    tryLoadSavedModel();
  }, [loadModel]);

  // Show nothing while we're checking — avoids a flash of the setup screen on re-launch
  if (checking) return null;

  if (!modelReady) {
    return <ModelSetupScreen onModelLoaded={() => setModelReady(true)} />;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  // initDB() runs synchronously on mount — creates tables on first launch,
  // is a no-op on subsequent launches because of IF NOT EXISTS.
  useEffect(() => {
    initDB();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LlamaProvider>
          <AppContent />
        </LlamaProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
