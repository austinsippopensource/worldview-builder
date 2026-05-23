/**
 * Themes screen — view and manage the extracted worldview themes.
 *
 * This is the "living document" of the user's beliefs. Each theme was either
 * extracted by the AI distiller or manually edited by the user. Themes are
 * used as context in all three AI conversation modes — they represent what
 * the AI knows about the user's worldview.
 *
 * Users can:
 *   - Expand a card to read the full description
 *   - Tap Edit to correct the AI's phrasing
 *   - Delete individual themes
 *   - Clear all themes (conversation history is preserved)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { WorldviewDB } from '../db/worldview';
import { ThemeCard } from '../components/ThemeCard';
import type { WorldviewTheme } from '../types';

export function ThemesScreen() {
  const [themes, setThemes] = useState<WorldviewTheme[]>([]);

  // reload() is memoised so it can be passed to child callbacks without
  // triggering unnecessary re-renders in useEffect
  const reload = useCallback(() => {
    setThemes(WorldviewDB.getAllThemes());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Called by ThemeCard's inline editor — persists the edit and refreshes the list. */
  function handleUpdate(id: string, theme: string, content: string) {
    WorldviewDB.upsertTheme(theme, content, id);
    reload();
  }

  function handleDelete(id: string) {
    WorldviewDB.deleteTheme(id);
    reload();
  }

  function handleClearAll() {
    Alert.alert(
      'Clear all themes',
      'This will delete all worldview themes. Your conversation history is preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            themes.forEach(t => WorldviewDB.deleteTheme(t.id));
            reload();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      {themes.length === 0 ? (
        // Empty state — shown before the user has had any distiller conversations
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💡</Text>
          <Text style={styles.emptyTitle}>No themes yet</Text>
          <Text style={styles.emptyText}>
            Start a conversation in the Distill tab. As you share your views, themes will be extracted and shown here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={themes}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <ThemeCard
              theme={item}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.count}>{themes.length} theme{themes.length !== 1 ? 's' : ''}</Text>
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={styles.clearAll}>Clear all</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e' },
  emptyText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  list: { padding: 16 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  count: { fontSize: 14, color: '#666', fontWeight: '500' },
  clearAll: { fontSize: 14, color: '#cc2200' },
});
