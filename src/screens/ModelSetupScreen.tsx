/**
 * Model setup screen — shown on first launch when no model is loaded.
 *
 * On mount it scans DocumentDirectoryPath for any previously downloaded
 * recommended model files so the user can skip re-downloading after a
 * rebuild. (Rebuilding / re-running the app does NOT delete DocumentDirectory
 * files — only a full app uninstall does.)
 *
 * Options:
 *   - Recommended card buttons: "Use this model" if already on disk, else "Download & load"
 *   - Browse for any .gguf file already on the device
 *   - Download from a custom HuggingFace / direct URL
 */

import React, { useState, useEffect } from 'react';
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

export const RECOMMENDED_MODELS = [
  {
    name: 'Gemma 4 E4B (recommended)',
    description: '~5 GB · Best quality, requires 8 GB RAM',
    url: 'https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q4_K_M.gguf',
  },
  {
    name: 'Qwen3-4B Q4_K_M',
    description: '~2.5 GB · Strong reasoning, good for debate',
    url: 'https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf',
  },
  {
    name: 'Phi-4 Mini Q4_K_M',
    description: '~2.5 GB · Fast and capable, requires 6 GB RAM',
    url: 'https://huggingface.co/bartowski/microsoft_Phi-4-mini-instruct-GGUF/resolve/main/microsoft_Phi-4-mini-instruct-Q4_K_M.gguf',
  },
  {
    name: 'Qwen3-1.7B Q8_0',
    description: '~1.8 GB · For low-RAM devices (4 GB RAM phones)',
    url: 'https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q8_0.gguf',
  },
];

interface Props {
  onModelLoaded: () => void;
}

export function ModelSetupScreen({ onModelLoaded }: Props) {
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  const { loadModel } = useLlama();

  useEffect(() => {
    checkDownloadedFiles();
  }, []);

  async function checkDownloadedFiles() {
    const found = new Set<string>();
    for (const m of RECOMMENDED_MODELS) {
      const fileName = m.url.split('/').pop() ?? '';
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      const exists = await RNFS.exists(filePath);
      if (exists) found.add(m.url);
    }
    setDownloadedFiles(found);
  }

  async function handlePickFile() {
    try {
      const result = await pick({ type: [types.allFiles] });
      const file = result[0];
      if (!file?.uri) return;

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

  async function handleDownloadUrl(url: string) {
    const fileName = url.split('/').pop() ?? 'model.gguf';
    const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    setDownloadingUrl(url);
    setDownloadProgress(0);

    try {
      const download = RNFS.downloadFile({
        fromUrl: url,
        toFile: destPath,
        progress: res => {
          if (res.contentLength > 0) {
            setDownloadProgress(res.bytesWritten / res.contentLength);
          } else {
            setDownloadProgress(-res.bytesWritten);
          }
        },
      });
      const result = await download.promise;
      if (result.statusCode !== 200) {
        Alert.alert('Download failed', `Status ${result.statusCode}`);
        return;
      }
      // Clear downloading state before the slow model-load step
      setDownloadingUrl(null);
      setDownloadedFiles(prev => new Set([...prev, url]));
      await loadAndSave(destPath);
    } catch (e) {
      Alert.alert('Download failed', 'Check the URL and your internet connection.');
    } finally {
      setDownloadingUrl(null);
    }
  }

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a1a2e" />
        <Text style={styles.loadingText}>Loading model into memory…</Text>
        <Text style={styles.loadingSubText}>This may take 30–60 seconds</Text>
      </View>
    );
  }

  const isBusy = !!downloadingUrl;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set up your AI model</Text>
      <Text style={styles.subtitle}>
        WorldviewBuilder runs entirely on your device. You need to load a GGUF model file once — it stays on your phone.
      </Text>

      <Text style={styles.sectionTitle}>Recommended models</Text>
      {RECOMMENDED_MODELS.map(m => {
        const fileName = m.url.split('/').pop() ?? '';
        const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
        const isDownloaded = downloadedFiles.has(m.url);
        const isThisDownloading = downloadingUrl === m.url;

        return (
          <View key={m.url} style={[styles.modelCard, isDownloaded && styles.modelCardDownloaded]}>
            <View style={styles.modelCardHeader}>
              <Text style={styles.modelName}>{m.name}</Text>
              {isDownloaded && <Text style={styles.onDeviceBadge}>On device</Text>}
            </View>
            <Text style={styles.modelDesc}>{m.description}</Text>
            {isThisDownloading ? (
              <View style={styles.downloadingRow}>
                <ActivityIndicator color="#1a1a2e" />
                <Text style={styles.downloadingText}>
                  {downloadProgress < 0
                    ? `${(Math.abs(downloadProgress) / 1024 / 1024).toFixed(0)} MB received…`
                    : downloadProgress > 0
                    ? `${Math.round(downloadProgress * 100)}%`
                    : 'Downloading…'}
                </Text>
              </View>
            ) : isDownloaded ? (
              <TouchableOpacity
                style={[styles.downloadCardBtn, isBusy && styles.disabledBtn]}
                onPress={() => loadAndSave(filePath)}
                disabled={isBusy}
              >
                <Text style={styles.downloadCardBtnText}>Use this model</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.downloadCardBtn, isBusy && styles.disabledBtn]}
                onPress={() => handleDownloadUrl(m.url)}
                disabled={isBusy}
              >
                <Text style={styles.downloadCardBtnText}>Download & load</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>Browse for a file</Text>
      <TouchableOpacity
        style={[styles.primaryBtn, isBusy && styles.disabledBtn]}
        onPress={handlePickFile}
        disabled={isBusy}
      >
        <Text style={styles.primaryBtnText}>Browse for .gguf file</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Download from URL</Text>
      <TextInput
        style={styles.urlInput}
        value={downloadUrl}
        onChangeText={setDownloadUrl}
        placeholder="https://huggingface.co/…/model.gguf"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {downloadingUrl !== null && !RECOMMENDED_MODELS.find(m => m.url === downloadingUrl) ? (
        <View style={styles.downloadingRow}>
          <ActivityIndicator color="#1a1a2e" />
          <Text style={styles.downloadingText}>
            {downloadProgress < 0
              ? `${(Math.abs(downloadProgress) / 1024 / 1024).toFixed(0)} MB received…`
              : downloadProgress > 0
              ? `${Math.round(downloadProgress * 100)}%`
              : 'Downloading…'}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.primaryBtn, (!downloadUrl.trim() || isBusy) && styles.disabledBtn]}
          onPress={() => {
            if (downloadUrl.trim()) handleDownloadUrl(downloadUrl.trim());
          }}
          disabled={!downloadUrl.trim() || isBusy}
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
  modelCardDownloaded: {
    borderColor: '#aac8aa',
    backgroundColor: '#f6fbf6',
  },
  modelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  modelName: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', flex: 1 },
  onDeviceBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2a7a2a',
    backgroundColor: '#d4f0d4',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  modelDesc: { fontSize: 13, color: '#555', marginBottom: 4 },
  downloadCardBtn: {
    marginTop: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  downloadCardBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
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
  downloadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  downloadingText: { fontSize: 14, color: '#1a1a2e', fontWeight: '500', flex: 1 },
});
