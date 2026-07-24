/**
 * HuntCardSkeleton — Issue #179
 *
 * Skeleton placeholder matching the exact layout of HuntCard:
 *   - Cover image area
 *   - Title line (h3)
 *   - Two body-text lines
 *
 * Rendered by HuntsList while data loads.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@providers/ThemeProvider';
import { SkeletonBase } from './SkeletonBase';

export function HuntCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.card, { borderColor: colors.border }]}
      accessible={true}
      accessibilityLabel="Loading hunt"
      accessibilityRole="none"
    >
      {/* Cover image placeholder */}
      <SkeletonBase width="100%" height={140} borderRadius={8} />

      {/* Title line */}
      <SkeletonBase width="70%" height={18} borderRadius={4} style={styles.gap} />

      {/* Body line 1 */}
      <SkeletonBase width="100%" height={14} borderRadius={4} />

      {/* Body line 2 (shorter — mirrors numberOfLines={2} truncation) */}
      <SkeletonBase width="55%" height={14} borderRadius={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  gap: {
    marginTop: 2,
  },
});
