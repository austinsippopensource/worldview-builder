/**
 * Distill screen — the starting point for building a worldview.
 *
 * The user has a Socratic conversation with the AI distiller. As they share
 * beliefs and values, the AI identifies recurring themes and emits <theme>
 * JSON blocks in its responses. This screen intercepts those blocks via the
 * onThemeDetected callback and writes them to SQLite.
 *
 * The themes bar at the top shows a live count of extracted themes so the
 * user can see their worldview taking shape during the conversation.
 *
 * Saving passages: long-pressing any AI message opens the rephrase modal
 * (MessageBubble). The WorldviewScreen saves these to raw_inputs (as source
 * material for the worldview) and also to the knowledge base as 'supporting'.
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
import { ConversationsDB } from '../db/conversations';
import { MessageBubble } from '../components/MessageBubble';
import { SearchResultsMessage } from '../components/SearchResultsMessage';
import { useAgenticChat } from '../llm/useAgenticChat';
import { distillerSystemPrompt } from '../llm/prompts';
import type { WorldviewTheme } from '../types';

export function WorldviewScreen() {
  const [themes, setThemes] = useState<WorldviewTheme[]>([]);
  const [input, setInput] = useState('');

  // Load existing themes from SQLite on mount so the distiller has context
  useEffect(() => {
    setThemes(WorldviewDB.getAllThemes());
  }, []);

  /**
   * Called by useAgenticChat when the distiller emits a <theme> block.
   * Persists the theme and updates local state so the themes bar re-renders.
   */
  function handleThemeDetected(theme: string, content: string) {
    const updated = WorldviewDB.upsertTheme(theme, content);
    setThemes(prev => {
      const idx = prev.findIndex(t => t.id === updated.id);
      if (idx >= 0) {
        // Update existing theme in place
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      // Prepend new theme (newest first)
      return [updated, ...prev];
    });
  }

  const { displayMessages, sendMessage, isGenerating, isSearching, modelLoaded } = useAgenticChat({
    mode: 'distiller',
    themes,
    systemPromptFn: distillerSystemPrompt,
    onThemeDetected: handleThemeDetected,
  });

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  }, [input, sendMessage]);

  /** Saves a passage from an AI message to raw_inputs and to the knowledge base. */
  function handleSavePassage(content: string, sourceUrl?: string) {
    WorldviewDB.addRawInput(content, sourceUrl ? 'web' : 'conversation', sourceUrl);
  }

  /** Saves a web search result passage to the knowledge base as 'supporting'. */
  function handleSaveKnowledge(content: string, sourceUrl?: string) {
    KnowledgeDB.add(content, 'supporting', { sourceUrl });
  }

  return (
    // KeyboardAvoidingView slides the content up when the keyboard appears
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Themes bar — shows a live count of extracted worldview themes */}
      <View style={styles.themesBar}>
        <Text style={styles.themesLabel}>
          {themes.length === 0
            ? 'Start talking — your worldview will build here'
            : `${themes.length} theme${themes.length !== 1 ? 's' : ''} identified`}
        </Text>
      </View>

      {/* Banner shown until the user loads a model in Settings */}
      {!modelLoaded && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>No model loaded — go to Settings to load one</Text>
        </View>
      )}

      {/* Banner shown while the AI is querying Brave Search */}
      {isSearching && (
        <View style={[styles.banner, styles.searchingBanner]}>
          <Text style={styles.bannerText}>Searching the web…</Text>
        </View>
      )}

      {/* Chat message list — renders differently for search_results vs normal messages */}
      <FlatList
        data={displayMessages}
        keyExtractor={m => m.id}
        renderItem={({ item }) =>
          item.role === 'search_results' ? (
            <SearchResultsMessage message={item} onSavePassage={handleSaveKnowledge} />
          ) : (
            <MessageBubble message={item} onSavePassage={handleSavePassage} />
          )
        }
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => {}}
      />

      {/* Input row — disabled while the model is generating */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Share your thoughts…"
          placeholderTextColor="#999"
          multiline
          editable={modelLoaded && !isGenerating}
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
  themesBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  themesLabel: { fontSize: 13, color: '#666' },
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
