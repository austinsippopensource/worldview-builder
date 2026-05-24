/**
 * Position chat screen — a focused conversation about one policy topic.
 *
 * The AI opens by either proposing a position derived from the user's existing
 * worldview themes, or asking a simple direct question if no themes exist yet.
 *
 * When the AI emits a <position> block the statement is saved to SQLite and a
 * confirmation banner appears. The conversation also emits <theme> blocks so
 * starting from the Positions tab can bootstrap the user's full worldview.
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
import { PositionsDB } from '../db/positions';
import { MessageBubble } from '../components/MessageBubble';
import { useAgenticChat } from '../llm/useAgenticChat';
import { positionSystemPrompt } from '../llm/prompts';
import type { WorldviewTheme } from '../types';

interface Props {
  navigation?: any;
  route?: { params?: { topic?: string; category?: string } };
}

export function PositionChatScreen({ navigation, route }: Props) {
  const topic = route?.params?.topic ?? '';
  const category = route?.params?.category ?? '';
  const [themes, setThemes] = useState<WorldviewTheme[]>([]);
  const [input, setInput] = useState('');
  const [savedStatement, setSavedStatement] = useState<string | null>(null);

  useEffect(() => {
    setThemes(WorldviewDB.getAllThemes());
    const existing = PositionsDB.get(topic);
    if (existing?.statement) setSavedStatement(existing.statement);
  }, [topic]);

  const systemPromptFn = useCallback(
    (t: WorldviewTheme[], hasSearch: boolean) =>
      positionSystemPrompt(topic, category, t, hasSearch),
    [topic, category],
  );

  function handleThemeDetected(theme: string, content: string) {
    WorldviewDB.upsertTheme(theme, content);
    setThemes(WorldviewDB.getAllThemes());
  }

  function handlePositionDetected(detectedTopic: string, statement: string) {
    PositionsDB.upsert(detectedTopic, category, statement);
    setSavedStatement(statement);
  }

  const { displayMessages, sendMessage, isGenerating, modelLoaded } = useAgenticChat({
    mode: 'position',
    themes,
    systemPromptFn,
    onThemeDetected: handleThemeDetected,
    onPositionDetected: handlePositionDetected,
    autoStart: true,
  });

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  }, [input, sendMessage]);

  function handleSavePassage(content: string) {
    WorldviewDB.addRawInput(content, 'conversation');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {savedStatement && (
        <View style={styles.savedBanner}>
          <Text style={styles.savedLabel}>Position saved</Text>
          <Text style={styles.savedStatement} numberOfLines={2}>{savedStatement}</Text>
        </View>
      )}

      <FlatList
        data={displayMessages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} onSavePassage={handleSavePassage} />
        )}
        contentContainerStyle={styles.messages}
      />

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
  savedBanner: {
    backgroundColor: '#e8f8e8',
    borderBottomWidth: 1,
    borderBottomColor: '#c0e8c0',
    padding: 12,
    paddingHorizontal: 16,
  },
  savedLabel: { fontSize: 11, fontWeight: '700', color: '#2a7a2a', marginBottom: 2 },
  savedStatement: { fontSize: 13, color: '#1a4a1a', lineHeight: 18 },
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
