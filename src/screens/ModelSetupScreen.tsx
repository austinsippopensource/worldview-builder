/**
 * Model setup screen — shown on first launch when no model is loaded.
 *
 * The app runs entirely on-device using llama.rn (a React Native binding to
 * llama.cpp). Before the main app can be used, the user needs to load a GGUF
 * model file. This screen guides them through two options:
 *
 *   Option 1 — Pick a file already downloaded (via the device file browser)
 *   Option 2 — Download a model from a URL directly to the device
 *
 * After a successful load, onModelLoaded() is called and App.tsx transitions
 * to the main navigation.
 *
 * Android note: file picker returns a content:// URI which can't be passed
 * directly to llama.rn. We copy it to the app's documents directory first.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import RNFS from 'react-native-fs';
import { pick, types } from 'react-native-document-picker';
import { Settings } from '../storage/settings';
import { useLlama } from '../llm/LlamaContext';

// The three recommended models shown as informational cards.
// Users can download any compatible GGUF model, not just these.
const RECOMMENDED_MODELS = [
  {
    name: 'Gemma 4 E4B (recommended)',
    description: '~2.5 GB · Best balance of quality and speed on modern phones',
    hint: 'Search "gemma-4-e4b GGUF" on huggingface.co',
  },
  {
    name: 'Qwen3-4B Q4_K_M',
    description: '~2.5 GB · Strong reasoning, great for debate and analysis',
    hint: 'Search "Qwen3-4B GGUF" on huggingface.co',
  },
  {
    name: 'Phi-4 Mini Q4_K_M',
    description: '~2.1 GB · Compact, fast, good instruction following',
    hint: 'Search "phi-4-mini GGUF" on huggingface.co',
  },
];

interface Props {
  onModelLoaded: () => void;
}

export function ModelSetupScreen({ onModelLoaded }: Props) {
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);  // 0.0 → 1.0
  const [loading, setLoading] = useState(false);
  const { loadModel } = useLlama();

  async function handlePickFile() {
    try {
      const result = await pick({ type: [types.allFiles] });
      const file = result[0];
      if (!file?.uri) return;

      // Android returns a content:// URI that llama.rn can't open directly.
      // Copy the file to the app's documents directory to get a real file path.
      let modelPath = file.uri;
      if (Platform.OS === 'android' && file.uri.startsWith('content://')) {
        const destPath = `${RNFS.DocumentDirectoryPath}/${file.name ?? 'model.gguf'}`;
        setLoading(true);
        try {
          await RNFS.copyFile(file.uri, destPath);
          modelPath = destPath;
        } catch (e) {
          Alert.alert('Error', 'Could not copy model file.');
          setLoading(false);
          return;
        }
      }

      await loadAndSave(modelPath);
    } catch (e: any) {
      if (!e?.message?.includes('cancel')) {
        Alert.alert('Error', 'Could not open file.');
      }
    }
  }

  async function handleDownload() {
    if (!downloadUrl.trim()) return;
    const url = downloadUrl.trim();
    const fileName = url.split('/').pop() ?? 'model.gguf';
    const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      const download = RNFS.downloadFile({
        fromUrl: url,
        toFile: destPath,
        progress: res => {
          // contentLength is 0 if the server doesn't send Content-Length
          if (res.contentLength > 0) {
            setDownloadProgress(res.bytesWritten / res.contentLength);
          }
        },
      });
      const result = await download.promise;
      if (result.statusCode !== 200) {
        Alert.alert('Download failed', `Status ${result.statusCode}`);
        return;
      }
      await loadAndSave(destPath);
    } catch (e) {
      Alert.alert('Download failed', 'Check the URL and your internet connection.');
    } finally {
      setDownloading(false);
    }
  }

  /**
   * Loads the model into the LlamaContext and saves the path to AsyncStorage
   * so it can be auto-loaded on the next app launch.
   */
  async function loadAndSave(path: string) {
    setLoading(true);
    try {
      await loadModel(path);
      await Settings.setModelPath(path);
      onModelLoaded();
    } catch (e) {
      Alert.alert('Failed to load model', 'Make sure the file is a valid GGUF model.');
    } finally {
      setLoading(false);
    }
  }

  // Show a full-screen loader while the model is being read into RAM
  // (this can take 30–60 seconds for a 2.5 GB model)
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a1a2e" />
        <Text style={styles.loadingText}>Loading model into memory…</Text>
        <Text style={styles.loadingSubText}>This may take 30–60 seconds</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set up your AI model</Text>
      <Text style={styles.subtitle}>
        WorldviewBuilder runs entirely on your device. You need to load a GGUF model file once — it stays on your phone.
      </Text>

      <Text style={styles.sectionTitle}>Recommended models</Text>
      {RECOMMENDED_MODELS.map(m => (
        <View key={m.name} style={styles.modelCard}>
          <Text style={styles.modelName}>{m.name}</Text>
          <Text style={styles.modelDesc}>{m.description}</Text>
          <Text style={styles.modelHint}>{m.hint}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Option 1 — Pick a file you already downloaded</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={handlePickFile}>
        <Text style={styles.primaryBtnText}>Browse for .gguf file</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Option 2 — Download from URL</Text>
      <TextInput
        style={styles.urlInput}
        value={downloadUrl}
        onChangeText={setDownloadUrl}
        placeholder="https://huggingface.co/…/model.gguf"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {downloading ? (
        // Progress bar shown during download
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${Math.round(downloadProgress * 100)}%` }]} />
          <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.primaryBtn, !downloadUrl.trim() && styles.disabledBtn]}
          onPress={handleDownload}
          disabled={!downloadUrl.trim()}
        >
          <Text style={styles.primaryBtnText}>Download &amp; load</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    gap: 12,
  },
  loadingText: { fontSize: 17, fontWeight: '600', color: '#1a1a2e' },
  loadingSubText: { fontSize: 14, color: '#666' },
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 20, paddingBottom: 60 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 10,
  },
  modelCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modelName: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 2 },
  modelDesc: { fontSize: 13, color: '#555', marginBottom: 4 },
  modelHint: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  primaryBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabledBtn: { opacity: 0.4 },
  urlInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  progressContainer: {
    height: 44,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#1a1a2e',
  },
  progressText: { color: '#fff', fontWeight: '700', fontSize: 15, zIndex: 1 },
});
