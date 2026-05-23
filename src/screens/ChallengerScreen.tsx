/**
 * Challenge screen — the AI steelmans opposing views and challenges the worldview.
 *
 * This is the intentional flip of the Advocate screen. After the user has had
 * their worldview defended, they engage an AI that pushes back with the
 * strongest counterarguments. The red header signals a different mental mode.
 *
 * Passages saved here go to the knowledge base as 'challenging' — they
 * represent evidence or arguments that cut against the user's beliefs, which
 * is exactly what they should be: material to revisit and grapple with.
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
import { challengerSystemPrompt } from '../llm/prompts';
import type { WorldviewTheme } from '../types';

export function ChallengerScreen() {
  const [themes, setThemes] = useState<WorldviewTheme[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    setThemes(WorldviewDB.getAllThemes());
  }, []);

  const { displayMessages, sendMessage, isGenerating, isSearching, modelLoaded } = useAgenticChat({
    mode: 'challenger',
    themes,
    systemPromptFn: challengerSystemPrompt,
  });

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  }, [input, sendMessage]);

  /** Saves a challenger passage as 'challenging' — it opposes the worldview. */
  function handleSavePassage(content: string, sourceUrl?: string) {
    KnowledgeDB.add(content, 'challenging', { sourceUrl });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Red header — visually signals "this AI is opposing you" */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Challenge Mode</Text>
        <Text style={styles.headerSub}>
          The AI argues against your worldview. Engage — let it find the cracks.
        </Text>
      </View>

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
          placeholder="Defend yourself, or concede a point…"
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
  header: { padding: 16, backgroundColor: '#8b0000' },  // dark red = confrontational mode
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: '#ffb3b3', marginTop: 4 },
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
    backgroundColor: '#8b0000',  // red send button matches the challenger theme
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
