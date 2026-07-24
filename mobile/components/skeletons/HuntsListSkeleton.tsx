/**
 * HuntsListSkeleton — Issue #179
 *
 * Renders a column of HuntCardSkeleton placeholders to fill the screen while
 * the hunts list is loading, preserving the same layout as the real HuntsList.
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ThemedView } from '@components/themed';
import { HuntCardSkeleton } from './HuntCardSkeleton';
import { SkeletonBase } from './SkeletonBase';

const SKELETON_COUNT = 4;

export function HuntsListSkeleton() {
  return (
    <ScrollView
      contentContainerStyle={styles.list}
      scrollEnabled={false}
      accessible={true}
      accessibilityLabel="Loading hunts"
    >
      {/* Heading skeleton matching the ListHeaderComponent h2 */}
      <SkeletonBase width={140} height={22} borderRadius={6} style={styles.heading} />

      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <HuntCardSkeleton key={i} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  heading: { marginBottom: 8 },
});
