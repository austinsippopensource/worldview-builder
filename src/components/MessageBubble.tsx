/**
 * A single chat bubble in any of the three conversation screens.
 *
 * User messages appear on the right (dark background).
 * AI messages appear on the left (light background) with a "Hold to save passage" hint.
 *
 * Long-pressing an AI bubble opens a bottom sheet where the user can:
 *   - Save the passage as-is to their worldview / knowledge base
 *   - Edit the text and save their rephrased version
 *
 * This rephrase-and-save flow is a core feature: it lets users capture AI
 * insights in their own words, which feeds back into the worldview document.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import type { Message } from '../types';

interface Props {
  message: Message;
  /** When provided, long-pressing an AI message opens the save/rephrase modal. */
  onSavePassage?: (content: string) => void;
}

export function MessageBubble({ message, onSavePassage }: Props) {
  const [rephrased, setRephrased] = useState('');
  const [showModal, setShowModal] = useState(false);

  const isUser = message.role === 'user';

  /** Opens the rephrase modal, pre-populated with the AI's original text. */
  function handleLongPress() {
    if (isUser || !onSavePassage) return;  // only AI messages can be saved
    setRephrased(message.content);
    setShowModal(true);
  }

  /** Saves the original AI text without any edits. */
  function handleSaveOriginal() {
    onSavePassage?.(message.content);
    setShowModal(false);
  }

  /** Saves whatever the user has typed in the edit field. */
  function handleSaveRephrased() {
    onSavePassage?.(rephrased);
    setShowModal(false);
  }

  return (
    <>
      <TouchableOpacity
        onLongPress={handleLongPress}
        activeOpacity={isUser ? 1 : 0.7}  // user messages don't react to touch visually
        style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
      >
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </Text>
        {/* Hint is shown only on AI messages when saving is possible */}
        {!isUser && onSavePassage && (
          <Text style={styles.hint}>Hold to save passage</Text>
        )}
      </TouchableOpacity>

      {/* Bottom sheet modal for save / rephrase */}
      <Modal visible={showModal} transparent animationType="slide">
        {/* Tapping the dark overlay closes the sheet */}
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          {/* stopPropagation prevents the sheet itself from closing when tapped inside */}
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Save to Worldview</Text>
            <TextInput
              style={styles.input}
              multiline
              value={rephrased}
              onChangeText={setRephrased}
              placeholder="Rephrase in your own words..."
              placeholderTextColor="#999"
            />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.btn} onPress={handleSaveOriginal}>
                <Text style={styles.btnText}>Save as-is</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSaveRephrased}>
                <Text style={[styles.btnText, styles.btnPrimaryText]}>Save rephrased</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 4,
    marginHorizontal: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a1a2e',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#1a1a1a',
  },
  hint: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#1a1a1a',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#1a1a2e',
    borderColor: '#1a1a2e',
  },
  btnText: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  btnPrimaryText: {
    color: '#fff',
  },
});
