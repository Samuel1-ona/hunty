/**
 * ProfileSkeleton — Issue #179
 *
 * Skeleton for a user profile card:
 *   - Avatar circle
 *   - Name line
 *   - Subtitle / address line
 *   - Two stat chips
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBase } from './SkeletonBase';
import { useTheme } from '@providers/ThemeProvider';

export function ProfileSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      {/* Avatar */}
      <SkeletonBase width={64} height={64} borderRadius={32} />

      <View style={styles.info}>
        {/* Name */}
        <SkeletonBase width={160} height={20} borderRadius={4} />
        {/* Address / subtitle */}
        <SkeletonBase width={220} height={14} borderRadius={4} style={styles.sub} />

        {/* Stats row */}
        <View style={styles.stats}>
          <SkeletonBase width={72} height={28} borderRadius={8} />
          <SkeletonBase width={72} height={28} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  info: {
    flex: 1,
    gap: 8,
  },
  sub: {
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
});
