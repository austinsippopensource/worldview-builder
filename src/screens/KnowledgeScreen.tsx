/**
 * Knowledge screen — browse and manage saved quotes and passages.
 *
 * The knowledge base is a curated collection of content the user has saved
 * from AI responses or web search results. Each entry is tagged as either
 * 'supporting' (reinforces the worldview) or 'challenging' (opposes it).
 *
 * The filter bar at the top lets users see all entries or filter by stance.
 * Counts on each filter button give a quick sense of the balance between
 * supporting and challenging material.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { KnowledgeDB } from '../db/knowledge';
import type { KnowledgeEntry, KnowledgeStance } from '../types';

export function KnowledgeScreen() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [filter, setFilter] = useState<KnowledgeStance | 'all'>('all');

  const reload = useCallback(() => {
    setEntries(KnowledgeDB.getAll());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function handleDelete(id: string) {
    Alert.alert('Delete entry', 'Remove this from your knowledge base?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          KnowledgeDB.delete(id);
          reload();
        },
      },
    ]);
  }

  // Filter is applied in JS (not SQL) so we only need one DB query
  const filtered = filter === 'all' ? entries : entries.filter(e => e.stance === filter);

  // Pre-compute counts for the filter bar labels
  const supporting = entries.filter(e => e.stance === 'supporting').length;
  const challenging = entries.filter(e => e.stance === 'challenging').length;

  return (
    <View style={styles.container}>
      {/* Stance filter bar */}
      <View style={styles.filterBar}>
        {(['all', 'supporting', 'challenging'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'all' ? `All (${entries.length})` : f === 'supporting' ? `Supporting (${supporting})` : `Challenging (${challenging})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{filter === 'challenging' ? '🔥' : '⚖️'}</Text>
          <Text style={styles.emptyTitle}>No entries yet</Text>
          <Text style={styles.emptyText}>
            Long-press any AI response to save passages, or use web search and save results from there.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.id}
          renderItem={({ item }) => (
            <KnowledgeCard entry={item} onDelete={handleDelete} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

/** A single knowledge entry card with delete button, optional source link, and date. */
function KnowledgeCard({
  entry,
  onDelete,
}: {
  entry: KnowledgeEntry;
  onDelete: (id: string) => void;
}) {
  const isSupporting = entry.stance === 'supporting';

  return (
    // Left border color codes the stance: dark blue = supporting, dark red = challenging
    <View style={[styles.card, isSupporting ? styles.cardSupporting : styles.cardChallenging]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, isSupporting ? styles.badgeSupporting : styles.badgeChallenging]}>
          <Text style={styles.badgeText}>{isSupporting ? 'Supporting' : 'Challenging'}</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.deleteBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.content}>{entry.content}</Text>

      {entry.author && <Text style={styles.meta}>— {entry.author}</Text>}

      {/* Source URL opens the original web page */}
      {entry.sourceUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(entry.sourceUrl!)}>
          <Text style={styles.url} numberOfLines={1}>{entry.sourceUrl}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.date}>{new Date(entry.createdAt).toLocaleDateString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  filterBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  filterBtnText: { fontSize: 12, color: '#555', fontWeight: '500' },
  filterBtnTextActive: { color: '#fff' },
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
  list: { padding: 12 },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    backgroundColor: '#fff',
  },
  cardSupporting: { borderLeftColor: '#1a1a2e' },
  cardChallenging: { borderLeftColor: '#8b0000' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSupporting: { backgroundColor: '#e8e8f8' },
  badgeChallenging: { backgroundColor: '#fde8e8' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#444' },
  deleteBtn: { fontSize: 14, color: '#aaa' },
  content: {
    fontSize: 14,
    color: '#333',
    lineHeight: 21,
    marginBottom: 6,
  },
  meta: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 4 },
  url: { fontSize: 11, color: '#4a4aaa', marginBottom: 4 },
  date: { fontSize: 11, color: '#bbb' },
});
