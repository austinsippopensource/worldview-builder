/**
 * An expandable card representing one worldview theme in the Themes screen.
 *
 * Collapsed: shows just the theme name + Edit/Delete actions.
 * Expanded: shows the full description text and the last-updated date.
 * Edit mode: replaces the description with text inputs so the user can correct
 *            or refine what the AI extracted.
 *
 * Users can edit themes because the AI doesn't always capture beliefs perfectly
 * on the first pass — the rephrase-and-edit flow is intentional.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import type { WorldviewTheme } from '../types';

interface Props {
  theme: WorldviewTheme;
  onUpdate: (id: string, theme: string, content: string) => void;
  onDelete: (id: string) => void;
}

export function ThemeCard({ theme, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  // Draft state holds the in-progress edits; only committed on "Save"
  const [draftTheme, setDraftTheme] = useState(theme.theme);
  const [draftContent, setDraftContent] = useState(theme.content);

  /** Commits edits and exits edit mode. */
  function handleSave() {
    if (!draftTheme.trim() || !draftContent.trim()) return;  // don't save empty fields
    onUpdate(theme.id, draftTheme.trim(), draftContent.trim());
    setEditing(false);
  }

  function handleDelete() {
    Alert.alert('Delete theme', `Remove "${theme.theme}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(theme.id) },
    ]);
  }

  return (
    <View style={styles.card}>
      {/* Header — always visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => { setExpanded(e => !e); setEditing(false); }}  // collapse clears edit mode
      >
        <Text style={styles.title} numberOfLines={expanded ? undefined : 1}>
          {theme.theme}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={e => { e.stopPropagation?.(); setEditing(true); setExpanded(true); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Body — only mounted when expanded */}
      {expanded && (
        <View style={styles.body}>
          {editing ? (
            <>
              {/* Edit mode: both theme name and content are editable */}
              <TextInput
                style={styles.inputTitle}
                value={draftTheme}
                onChangeText={setDraftTheme}
                placeholder="Theme name"
                placeholderTextColor="#aaa"
              />
              <TextInput
                style={styles.inputContent}
                value={draftContent}
                onChangeText={setDraftContent}
                multiline
                placeholder="Theme description"
                placeholderTextColor="#aaa"
                textAlignVertical="top"
              />
              <View style={styles.editActions}>
                {/* Cancel discards draft changes and restores original values */}
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setEditing(false);
                    setDraftTheme(theme.theme);
                    setDraftContent(theme.content);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Read mode: just show the content text
            <Text style={styles.content}>{theme.content}</Text>
          )}
          <Text style={styles.date}>
            Updated {new Date(theme.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 13,
    color: '#4a0080',
    fontWeight: '500',
  },
  deleteText: { color: '#cc2200' },
  chevron: { fontSize: 11, color: '#999' },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  content: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  date: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 8,
  },
  inputTitle: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputContent: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 15,
    color: '#1a1a1a',
    minHeight: 80,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelBtnText: { fontSize: 14, color: '#555' },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
  },
  saveBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});
