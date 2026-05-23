/**
 * Advocate screen — the AI argues FOR the user's worldview.
 *
 * Once the user has built their worldview in the Distill screen, this screen
 * lets them engage with an AI that has deeply internalised those themes and
 * argues for them with conviction. The intended use: push back on the AI to
 * understand WHY you believe what you believe at a deeper level.
 *
 * Passages saved here go to the knowledge base as 'supporting' (they reinforce
 * the user's worldview, since the AI is arguing for it in this mode).
 *
 * Note: if no themes have been built yet, the input is disabled and a banner
 * prompts the user to go build their worldview first.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { WorldviewDB } from '../db/worldview';
import { KnowledgeDB } from '../db/knowledge';
import { MessageBubble } from '../components/MessageBubble';
import { SearchResultsMessage } from '../components/SearchResultsMessage';
import { useAgenticChat } from '../llm/useAgenticChat';
import { advocateSystemPrompt } from '../llm/prompts';
import type { WorldviewTheme } from '../types';

export function AdvocateScreen() {
  const [themes, setThemes] = useState<WorldviewTheme[]>([]);
  const [input, setInput] = useState('');

  // Load themes on mount — the advocate needs them as context for its arguments
  useEffect(() => {
    setThemes(WorldviewDB.getAllThemes());
  }, []);

  // No onThemeDetected because the advocate doesn't write back to the worldview document
  const { displayMessages, sendMessage, isGenerating, isSearching, modelLoaded } = useAgenticChat({
    mode: 'advocate',
    themes,
    systemPromptFn: advocateSystemPrompt,
  });

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  }, [input, sendMessage]);

  /** Saves a passage from the advocate's arguments as a 'supporting' knowledge entry. */
  function handleSavePassage(content: string, sourceUrl?: string) {
    KnowledgeDB.add(content, 'supporting', { sourceUrl });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Dark header distinguishes this mode visually from the Distill screen */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Advocate Mode</Text>
        <Text style={styles.headerSub}>
          The AI argues for your worldview. Push back — see how it defends your positions.
        </Text>
      </View>

      {/* Prompt to build worldview first if no themes exist yet */}
      {themes.length === 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Build your worldview first in the Distill tab.</Text>
        </View>
      )}

      {isSearching && (
        <View style={[styles.banner, styles.searchingBanner]}>
          <Text style={styles.bannerText}>Searching the web…</Text>
        </View>
      )}

      <FlatList
        data={displayMessages}
        keyExtractor={m => m.id}
        renderItem={({ item }) =>
          item.role === 'search_results' ? (
            <SearchResultsMessage message={item} onSavePassage={handleSavePassage} />
          ) : (
            <MessageBubble message={item} onSavePassage={handleSavePassage} />
          )
        }
        contentContainerStyle={styles.messages}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Push back, ask it to elaborate…"
          placeholderTextColor="#999"
          multiline
          editable={modelLoaded && !isGenerating && themes.length > 0}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isGenerating) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isGenerating}
        >
          <Text style={styles.sendBtnText}>{isGenerating ? '…' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  header: { padding: 16, backgroundColor: '#1a1a2e' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: '#aab', marginTop: 4 },
  banner: { backgroundColor: '#fff3cd', padding: 10, alignItems: 'center' },
  searchingBanner: { backgroundColor: '#e8f0ff' },
  bannerText: { color: '#555', fontSize: 13 },
  messages: { paddingVertical: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    color: '#1a1a1a',
  },
  sendBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
