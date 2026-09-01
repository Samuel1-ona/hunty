import { HuntCard } from '@components/HuntCard';
import { HuntsListSkeleton } from '@components/skeletons';
import { ThemedCustomText } from '@components/themed';
import { getActiveHuntsForFeed } from '@store/huntStore';
import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet } from 'react-native';

export function HuntsList() {
  const { data: hunts = [], isLoading } = useQuery({
    queryKey: ['hunts', 'active'],
    queryFn: getActiveHuntsForFeed,
  });

  // #179 — Animated skeleton placeholders while data loads
  if (isLoading) {
    return <HuntsListSkeleton />;
  }

  return (
    <FlatList
      testID="hunts-list"
      data={hunts}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <HuntCard hunt={item} />}
      ListHeaderComponent={
        <ThemedCustomText variant="h2" style={styles.heading}>
          Active Hunts
        </ThemedCustomText>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  heading: { marginBottom: 8 },
});
