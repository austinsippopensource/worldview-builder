/**
 * Displays web search results inline in a chat thread.
 *
 * When the AI calls the search tool (emits a <search> tag), useAgenticChat
 * creates a 'search_results' message and adds it to the conversation. This
 * component renders those messages as a collapsible card showing the query
 * and up to 5 results from Brave Search.
 *
 * Each result can be saved to the knowledge base with a single tap. The
 * knowledge entry captures the title, description, and source URL.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
} from 'react-native';
import type { Message, SearchResult } from '../types';

interface Props {
  message: Message;
  /** When provided, each result card shows a save button. */
  onSavePassage?: (content: string, sourceUrl?: string) => void;
}

export function SearchResultsMessage({ message, onSavePassage }: Props) {
  // Results start expanded so the user can immediately see what was found
  const [expanded, setExpanded] = useState(true);
  const results: SearchResult[] = message.searchResults ?? [];

  return (
    <View style={styles.container}>
      {/* Header row shows the query and a chevron to collapse/expand */}
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(e => !e)}>
        <Text style={styles.icon}>🔍</Text>
        <Text style={styles.query}>"{message.searchQuery}"</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.results}>
          {results.length === 0 ? (
            <Text style={styles.empty}>No results found.</Text>
          ) : (
            results.map((r, i) => (
              <SearchResultCard
                key={i}
                result={r}
                onSave={onSavePassage}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

/** An individual search result with a title, URL, description, and optional save button. */
function SearchResultCard({
  result,
  onSave,
}: {
  result: SearchResult;
  onSave?: (content: string, url?: string) => void;
}) {
  function handleSave() {
    // Combine title, description, and URL into a single content string for the knowledge entry
    const content = `${result.title}\n\n${result.description}\n\nSource: ${result.url}`;
    onSave?.(content, result.url);
    Alert.alert('Saved', 'Added to knowledge base.');
  }

  return (
    <View style={styles.card}>
      {/* Tapping the title/URL opens the page in the device browser */}
      <TouchableOpacity onPress={() => Linking.openURL(result.url)}>
        <Text style={styles.cardTitle}>{result.title}</Text>
        <Text style={styles.cardUrl} numberOfLines={1}>{result.url}</Text>
      </TouchableOpacity>
      <Text style={styles.cardDesc}>{result.description}</Text>
      {onSave && (
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>+ Add to knowledge base</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 12,
    backgroundColor: '#f8f4ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0c0ff',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  icon: { fontSize: 14 },
  query: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#4a0080',
  },
  chevron: { fontSize: 11, color: '#4a0080' },
  results: { paddingHorizontal: 10, paddingBottom: 10 },
  empty: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e8e0ff',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  cardUrl: {
    fontSize: 11,
    color: '#6060cc',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  saveBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#f0ebff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  saveBtnText: {
    fontSize: 12,
    color: '#4a0080',
    fontWeight: '600',
  },
});
