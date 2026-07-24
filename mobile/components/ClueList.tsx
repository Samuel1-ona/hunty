import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView, ThemedCustomText } from './themed';

interface Clue {
  id: number;
  title: string;
  description: string;
  points: number;
  solved: boolean;
}

interface ClueListProps {
  clues: Clue[];
  currentIndex: number;
  onSelectClue: (index: number) => void;
  onOpenScanner: () => void;
  isLoading?: boolean;
}

export const ClueList: React.FC<ClueListProps> = ({
  clues,
  currentIndex,
  onSelectClue,
  onOpenScanner,
  isLoading = false,
}) => {
  const renderClueItem = ({ item, index }: { item: Clue; index: number }) => {
    const isActive = index === currentIndex;
    const isSolved = item.solved;

    return (
      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Clue ${index + 1}: ${item.title}, ${item.points} points${isSolved ? ', solved' : ''}`}
        accessibilityHint={isActive ? 'Currently selected clue' : 'Tap to select this clue'}
        accessibilityState={{ selected: isActive, disabled: false }}
        onPress={() => onSelectClue(index)}
        activeOpacity={0.7}
        style={[
          styles.clueItem,
          isActive && styles.clueItemActive,
          isSolved && styles.clueItemSolved,
        ]}
      >
        {isActive && (
          <LinearGradient
            colors={['#3737A4', '#0C0C4F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.clueItemBackground}
          />
        )}

        <View style={styles.clueContent}>
          <View style={styles.clueHeader}>
            <Text style={[styles.clueIndex, isActive && styles.clueIndexActive]}>
              Clue {index + 1}
            </Text>
            <Text style={[styles.cluePoints, isActive && styles.cluePointsActive]}>
              {item.points} pts
            </Text>
          </View>

          <Text
            style={[
              styles.clueTitle,
              isActive && styles.clueTitleActive,
              isSolved && styles.clueTitleSolved,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text
            style={[
              styles.clueDescription,
              isActive && styles.clueDescriptionActive,
            ]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
        </View>

        {isSolved && (
          <View accessible={true} accessibilityLabel="Solved" style={styles.solvedBadge}>
            <Text style={styles.solvedText}>✓</Text>
          </View>
        )}

        {!isSolved && (
          <Text style={[styles.chevronText, { color: isActive ? 'white' : '#9CA3AF' }]}>›</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedCustomText variant="h3" style={styles.title}>
          Clues
        </ThemedCustomText>

        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Scan QR code"
          accessibilityHint="Opens the QR code scanner to solve a clue"
          onPress={onOpenScanner}
          activeOpacity={0.8}
          style={styles.scanButton}
        >
          <LinearGradient
            colors={['#E3225C', '#7B1C4A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scanButtonGradient}
          >
            <Text style={styles.scanIcon}>◉</Text>
            <Text style={styles.scanButtonText}>Scan QR</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clues}
        renderItem={renderClueItem}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  scanButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  scanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scanIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clueItemActive: {
    borderColor: '#3737A4',
    backgroundColor: 'transparent',
  },
  clueItemSolved: {
    opacity: 0.6,
  },
  clueItemBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    zIndex: -1,
  },
  clueContent: {
    flex: 1,
  },
  clueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clueIndex: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  clueIndexActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  cluePoints: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0C0C4F',
  },
  cluePointsActive: {
    color: 'white',
  },
  clueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  clueTitleActive: {
    color: 'white',
  },
  clueTitleSolved: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  clueDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  clueDescriptionActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  solvedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  solvedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chevron: {
    marginLeft: 8,
  },
  chevronText: {
    marginLeft: 8,
    fontSize: 20,
    fontWeight: '700',
  },
});
