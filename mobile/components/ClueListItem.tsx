/**
 * ClueListItem — animated clue card for the mobile play screen.
 *
 * Animation sequence on unlock:
 *   1. Item slides up from 24 px below its final position
 *   2. Fades in from 0 → 1 opacity
 *   3. Briefly scales up to 1.04 then settles at 1.0 (spring "pop")
 *
 * The animation fires once when `isUnlocked` transitions false → true.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import type { ClueInfo } from '@lib/types';

interface ClueListItemProps {
  clue: ClueInfo;
  index: number;
  /** Whether this clue is the one the player is currently solving. */
  isActive: boolean;
  /** Whether this clue has been solved / unlocked. */
  isUnlocked: boolean;
  onPress?: () => void;
}

export function ClueListItem({
  clue,
  index,
  isActive,
  isUnlocked,
  onPress,
}: ClueListItemProps) {
  const opacity = useSharedValue(isUnlocked ? 1 : 0);
  const translateY = useSharedValue(isUnlocked ? 0 : 24);
  const scale = useSharedValue(isUnlocked ? 1 : 0.96);

  useEffect(() => {
    if (!isUnlocked) return;

    // Slide + fade in
    opacity.value = withTiming(1, { duration: 280 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });

    // Scale pop: grow slightly then settle
    scale.value = withSequence(
      withSpring(1.04, { damping: 10, stiffness: 300 }),
      withSpring(1.0, { damping: 14, stiffness: 200 }),
    );
  }, [isUnlocked]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const isLocked = !isUnlocked && !isActive;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        onPress={isLocked ? undefined : onPress}
        style={[
          styles.card,
          isActive && styles.cardActive,
          isUnlocked && styles.cardUnlocked,
          isLocked && styles.cardLocked,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Clue ${index + 1}: ${isLocked ? 'Locked' : clue.question}`}
        accessibilityState={{ disabled: isLocked }}
      >
        {/* Index badge */}
        <View style={[styles.badge, isUnlocked && styles.badgeUnlocked, isActive && styles.badgeActive]}>
          <Text style={styles.badgeText}>{index + 1}</Text>
        </View>

        <View style={styles.content}>
          {isLocked ? (
            <Text style={styles.lockedText}>🔒 Locked</Text>
          ) : (
            <>
              <Text style={[styles.question, isUnlocked && styles.questionUnlocked]} numberOfLines={2}>
                {clue.question}
              </Text>
              <View style={styles.meta}>
                <Text style={styles.points}>{clue.points} pts</Text>
                {isUnlocked && <Text style={styles.solvedBadge}>✓ Solved</Text>}
              </View>
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#fff',
    shadowColor: '#0C0C4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#E8E8F5',
  },
  cardActive: {
    borderColor: '#3737A4',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  cardUnlocked: {
    borderColor: '#39A437',
    backgroundColor: '#F6FFF6',
  },
  cardLocked: {
    opacity: 0.45,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8E8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeActive: {
    backgroundColor: '#3737A4',
  },
  badgeUnlocked: {
    backgroundColor: '#39A437',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A3E',
    marginBottom: 4,
  },
  questionUnlocked: {
    color: '#194F0C',
  },
  lockedText: {
    fontSize: 14,
    color: '#9999BB',
    fontWeight: '500',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  points: {
    fontSize: 12,
    color: '#6666AA',
    fontWeight: '500',
  },
  solvedBadge: {
    fontSize: 12,
    color: '#39A437',
    fontWeight: '700',
  },
});
