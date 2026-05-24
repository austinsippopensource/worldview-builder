/**
 * Settings screen — modal accessible via the gear icon from any tab.
 *
 * Three sections:
 *
 *   Web Search  — enter a Brave Search API key to enable agentic web search
 *   AI Model    — shows current model status; lets the user load a different model
 *   Data        — nuclear option to wipe all SQLite data (model file is preserved)
 *
 * The Brave API key is stored in AsyncStorage (not SQLite) because it's a
 * credential, not app data. The model path is also in AsyncStorage for the
 * same reason (it's a file system pointer, not content).
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { pick, types } from 'react-native-document-picker';
import RNFS from 'react-native-fs';

import { Platform } from 'react-native';
import { Settings } from '../storage/settings';
import { useLlama } from '../llm/LlamaContext';
import { RECOMMENDED_MODELS } from './ModelSetupScreen';
import { WorldviewDB } from '../db/worldview';
import { KnowledgeDB } from '../db/knowledge';
import { ConversationsDB } from '../db/conversations';
import { getDB } from '../db/schema';

export function SettingsScreen() {
  const [braveKey, setBraveKey] = useState('');
  const [savedBraveKey, setSavedBraveKey] = useState<string | null>(null);
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { loadModel, modelLoaded } = useLlama();

  // Load current settings from AsyncStorage on mount
  useEffect(() => {
    Settings.getBraveApiKey().then(k => {
      setSavedBraveKey(k);
      if (k) setBraveKey(k);
    });
    Settings.getModelPath().then(setModelPath);
  }, []);

  async function saveBraveKey() {
    const trimmed = braveKey.trim();
    await Settings.setBraveApiKey(trimmed);
    setSavedBraveKey(trimmed);
    Alert.alert('Saved', trimmed ? 'Brave API key saved.' : 'Brave API key cleared.');
  }

  async function handleChangeModel() {
    try {
      const result = await pick({ type: [types.allFiles] });
      const file = result[0];
      if (!file?.uri) return;

      // Same Android content:// URI handling as ModelSetupScreen
      let path = file.uri;
      if (Platform.OS === 'android' && file.uri.startsWith('content://')) {
        const dest = `${RNFS.DocumentDirectoryPath}/${file.name ?? 'model.gguf'}`;
        setLoadingModel(true);
        await RNFS.copyFile(file.uri, dest);
        path = dest;
      }

      setLoadingModel(true);
      await loadModel(path);
      await Settings.setModelPath(path);
      setModelPath(path);
      Alert.alert('Model loaded', 'New model is ready.');
    } catch (e: any) {
      if (!e?.message?.includes('cancel')) {
        Alert.alert('Error', 'Could not load model.');
      }
    } finally {
      setLoadingModel(false);
    }
  }

  async function handleDownloadAndSwitch(url: string) {
    const fileName = url.split('/').pop() ?? 'model.gguf';
    const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    setDownloading(true);
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
      setLoadingModel(true);
      await loadModel(destPath);
      await Settings.setModelPath(destPath);
      setModelPath(destPath);
      Alert.alert('Model switched', `Now using ${fileName}`);
    } catch (e) {
      Alert.alert('Failed', 'Download or model load failed. Check your connection.');
    } finally {
      setDownloading(false);
      setLoadingModel(false);
    }
  }

  /**
   * Wipes all app content from SQLite.
   * The model file itself is NOT deleted — only the conversation/theme/knowledge data.
   * The user will need to reload the model from Settings after clearing (it's still on disk).
   */
  function handleClearAllData() {
    Alert.alert(
      'Clear all data',
      'This will permanently delete all themes, conversations, and knowledge entries. Your model file is preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear everything',
          style: 'destructive',
          onPress: () => {
            const db = getDB();
            db.execute('DELETE FROM worldview_themes');
            db.execute('DELETE FROM raw_inputs');
            db.execute('DELETE FROM conversations');
            db.execute('DELETE FROM knowledge_entries');
            Alert.alert('Done', 'All data cleared.');
          },
        },
      ],
    );
  }

  // Extract just the filename from the full path for display
  const modelName = modelPath ? modelPath.split('/').pop() : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Web Search ──────────────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Web Search</Text>
      <Text style={styles.description}>
        Add a Brave Search API key to enable the AI to search the internet for sources and quotes. Get a free key at search.brave.com/api.
      </Text>
      <TextInput
        style={styles.input}
        value={braveKey}
        onChangeText={setBraveKey}
        placeholder="BSA…"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry  // hides the key from casual observers
      />
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={saveBraveKey}>
          <Text style={styles.btnText}>Save key</Text>
        </TouchableOpacity>
        {/* Status badge shows at a glance whether search is configured */}
        {savedBraveKey ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>✓ Active</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, styles.statusInactive]}>
            <Text style={[styles.statusText, styles.statusTextInactive]}>Not set — search disabled</Text>
          </View>
        )}
      </View>

      {/* ── AI Model ────────────────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>AI Model</Text>
      <View style={styles.modelInfo}>
        <Text style={styles.modelStatus}>
          {modelLoaded ? '✓ Model loaded' : '✗ No model loaded'}
        </Text>
        {modelName && (
          <Text style={styles.modelName} numberOfLines={2}>{modelName}</Text>
        )}
      </View>
      {loadingModel ? (
        <ActivityIndicator style={{ marginTop: 12 }} color="#1a1a2e" />
      ) : (
        <TouchableOpacity style={styles.btn} onPress={handleChangeModel}>
          <Text style={styles.btnText}>{modelLoaded ? 'Change model' : 'Load model'}</Text>
        </TouchableOpacity>
      )}

      {/* ── Switch Model ────────────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Switch Model</Text>
      <Text style={styles.description}>
        Download a different model to switch to it. The new model replaces the active one immediately.
      </Text>
      {RECOMMENDED_MODELS.map(m => (
        <View key={m.name} style={styles.modelCard}>
          <Text style={styles.modelCardName}>{m.name}</Text>
          <Text style={styles.modelCardDesc}>{m.description}</Text>
          {downloading ? (
            <View style={styles.downloadingRow}>
              <ActivityIndicator color="#1a1a2e" />
              <Text style={styles.downloadingText}>
                {downloadProgress < 0
                  ? `${(Math.abs(downloadProgress) / 1024 / 1024).toFixed(0)} MB received…`
                  : downloadProgress > 0
                  ? `${Math.round(downloadProgress * 100)}%`
                  : 'Downloading… (this may take a few minutes)'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.switchBtn]}
              onPress={() => handleDownloadAndSwitch(m.url)}
              disabled={loadingModel}
            >
              <Text style={styles.btnText}>Download & switch</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* ── Data ────────────────────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Data</Text>
      <TouchableOpacity style={[styles.btn, styles.dangerBtn]} onPress={handleClearAllData}>
        <Text style={[styles.btnText, styles.dangerText]}>Clear all data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  dangerBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cc2200' },
  dangerText: { color: '#cc2200' },
  statusBadge: {
    backgroundColor: '#e8f8e8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusInactive: { backgroundColor: '#f8f0e8' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#2a7a2a' },
  statusTextInactive: { color: '#885500' },
  modelInfo: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
    gap: 4,
  },
  modelStatus: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  modelName: { fontSize: 12, color: '#666' },
  modelCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modelCardName: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 2 },
  modelCardDesc: { fontSize: 13, color: '#555', marginBottom: 10 },
  switchBtn: { alignSelf: 'flex-start' },
  downloadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  downloadingText: { fontSize: 13, color: '#1a1a2e', fontWeight: '500', flex: 1 },
});
