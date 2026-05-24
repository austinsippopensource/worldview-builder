/**
 * Positions screen — a structured list of concrete policy topics.
 *
 * Each topic lets the user articulate where they stand with LLM help.
 * Positions are bidirectional: they can bootstrap the worldview (if the user
 * starts here) or be derived from it (if themes already exist).
 *
 * Tapping a topic navigates to PositionChatScreen for that topic.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PositionsDB } from '../db/positions';
import type { Position } from '../types';

export const POLICY_TOPICS: { category: string; topics: { topic: string; hint: string }[] }[] = [
  {
    category: 'Economic Policy',
    topics: [
      { topic: 'Taxation & Government Spending', hint: 'How much should government collect and spend?' },
      { topic: 'Healthcare System', hint: 'Public, private, or mixed?' },
      { topic: 'Wealth & Income Inequality', hint: 'Should it be actively reduced? How?' },
      { topic: 'Social Safety Net', hint: 'Welfare, UBI, unemployment — how much support?' },
    ],
  },
  {
    category: 'Social Policy',
    topics: [
      { topic: 'Abortion & Reproductive Rights', hint: 'When should it be legal, restricted, or banned?' },
      { topic: 'Gun Rights & Control', hint: 'How should firearms be regulated?' },
      { topic: 'Drug Policy', hint: 'Legalize, decriminalize, or prohibit?' },
      { topic: 'Immigration', hint: 'How open or restricted should borders be?' },
      { topic: 'Criminal Justice & Policing', hint: 'Reform, expand, or restructure law enforcement?' },
    ],
  },
  {
    category: 'Governance',
    topics: [
      { topic: 'Role of Government', hint: 'How much should government intervene in daily life?' },
      { topic: 'Free Speech & Expression', hint: 'What speech, if any, should be restricted?' },
      { topic: 'Privacy & Surveillance', hint: 'How much monitoring by government or corporations is acceptable?' },
      { topic: 'Democracy & Elections', hint: 'How should political systems be structured?' },
    ],
  },
  {
    category: 'Foreign Policy',
    topics: [
      { topic: 'Military Intervention', hint: 'When should a country use military force?' },
      { topic: 'Climate & Environmental Policy', hint: 'How aggressively should governments act on climate?' },
      { topic: 'Foreign Aid', hint: 'Should wealthy nations support poorer ones? How?' },
    ],
  },
  {
    category: 'Rights & Ethics',
    topics: [
      { topic: 'Capital Punishment', hint: 'Is the death penalty ever justified?' },
      { topic: 'Religious Freedom vs. Secular Law', hint: 'Where do religious rights end and civil rights begin?' },
      { topic: 'End-of-Life Rights', hint: 'Should assisted dying be legal?' },
      { topic: 'Education & What Schools Teach', hint: 'What should schools teach, and who decides?' },
    ],
  },
];

interface Props {
  navigation?: any;
}

export function PositionsScreen({ navigation }: Props) {
  const [savedPositions, setSavedPositions] = React.useState<Record<string, Position>>({});

  const reload = useCallback(() => {
    const all = PositionsDB.getAll();
    const byTopic: Record<string, Position> = {};
    for (const p of all) byTopic[p.topic] = p;
    setSavedPositions(byTopic);
  }, []);

  // Reload whenever the screen comes into focus (e.g. returning from a chat)
  useFocusEffect(reload);

  const sections = POLICY_TOPICS.map(cat => ({
    title: cat.category,
    data: cat.topics,
  }));

  const articulated = Object.keys(savedPositions).filter(t => savedPositions[t].statement).length;
  const total = POLICY_TOPICS.reduce((n, c) => n + c.topics.length, 0);

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <Text style={styles.progressText}>
          {articulated === 0
            ? 'Tap any topic to articulate your position'
            : `${articulated} of ${total} positions articulated`}
        </Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={item => item.topic}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.category}>{section.title}</Text>
        )}
        renderItem={({ item, section }) => {
          const saved = savedPositions[item.topic];
          const hasStatement = !!saved?.statement;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                navigation.navigate('PositionChat', {
                  topic: item.topic,
                  category: section.title,
                })
              }
            >
              <View style={styles.rowContent}>
                <View style={styles.rowHeader}>
                  <Text style={styles.topic}>{item.topic}</Text>
                  {hasStatement && <Text style={styles.checkmark}>✓</Text>}
                </View>
                {hasStatement ? (
                  <Text style={styles.statement} numberOfLines={2}>{saved.statement}</Text>
                ) : (
                  <Text style={styles.hint}>{item.hint}</Text>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  progressBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressText: { fontSize: 13, color: '#666' },
  list: { paddingBottom: 32 },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8e8',
  },
  rowContent: { flex: 1 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  topic: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', flex: 1 },
  checkmark: { fontSize: 14, color: '#2a7a2a' },
  statement: { fontSize: 13, color: '#444', lineHeight: 18 },
  hint: { fontSize: 13, color: '#999' },
  chevron: { fontSize: 20, color: '#ccc', marginLeft: 8 },
});
