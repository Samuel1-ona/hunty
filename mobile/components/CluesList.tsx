/**
 * CluesList Component — Shows all clues for a hunt with completion indicators.
 *
 * Used in nested.tsx as a drill-down list to navigate between clues sequentially.
 * Visual indicators:
 * - ✓ for completed clues
 * - ● for current clue (highlight)
 * - ○ for pending clues
 */

import { StyleSheet, ScrollView, Text, Pressable, View } from 'react-native';
import type { Clue } from '@lib/types';

interface CluesListProps {
  clues: Clue[];
  currentIndex: number;
  completedIndices: Set<number>;
  onSelectClue: (index: number) => void;
}

export function CluesList({
  clues,
  currentIndex,
  completedIndices,
  onSelectClue,
}: CluesListProps) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={true}>
      <Text style={styles.header}>Clues Progress</Text>
      {clues.map((clue, index) => {
        const isCompleted = completedIndices.has(index);
        const isCurrent = index === currentIndex;
        const isDisabled = !isCompleted && index > 0 && !completedIndices.has(index - 1);

        return (
          <Pressable
            key={clue.id}
            onPress={() => !isDisabled && onSelectClue(index)}
            disabled={isDisabled}
            style={[
              styles.clueItem,
              isCurrent && styles.currentClue,
              isCompleted && styles.completedClue,
              isDisabled && styles.disabledClue,
            ]}
          >
            <View style={styles.clueIndicator}>
              <Text
                style={[
                  styles.indicator,
                  isCompleted && styles.completedIndicator,
                  isCurrent && styles.currentIndicator,
                  isDisabled && styles.disabledIndicator,
                ]}
              >
                {isCompleted ? '✓' : isCurrent ? '●' : '○'}
              </Text>
              <Text style={[styles.clueNumber, isDisabled && styles.disabledText]}>
                Clue {index + 1}
              </Text>
            </View>
            <Text
              style={[styles.clueText, isDisabled && styles.disabledText]}
              numberOfLines={1}
            >
              {clue.question}
            </Text>
            {isCompleted && <Text style={styles.completedBadge}>Completed</Text>}
          </Pressable>
        );
      })}
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 250,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    padding: 12,
  },
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  clueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currentClue: {
    backgroundColor: '#e8f4f8',
    borderColor: '#17a2b8',
    borderWidth: 2,
  },
  completedClue: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  disabledClue: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  clueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  indicator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginRight: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  currentIndicator: {
    color: '#17a2b8',
    fontSize: 18,
  },
  completedIndicator: {
    color: '#4caf50',
  },
  disabledIndicator: {
    color: '#bdbdbd',
  },
  clueNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  clueText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
  },
  disabledText: {
    color: '#aaa',
  },
  completedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#4caf50',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  spacer: {
    height: 8,
  },
});
