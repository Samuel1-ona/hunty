import { StyleSheet } from 'react-native';
import { ThemedView } from '@components/themed';
import { SkeletonBase } from './SkeletonBase';

export function FeedItemSkeleton() {
  return (
    <ThemedView style={styles.card}>
      <SkeletonBase width="60%" height={18} borderRadius={4} />
      <SkeletonBase width="100%" height={14} borderRadius={4} />
      <SkeletonBase width="40%" height={12} borderRadius={4} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
});
