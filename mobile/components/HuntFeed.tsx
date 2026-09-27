import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getActiveHuntsForFeed } from '@store/huntStore';
import { ThemedCustomText, ThemedView } from '@components/themed';
import { HuntFeedItem } from './HuntFeedItem';

export function HuntFeed() {
  const { data: hunts = [], isLoading, isError } = useQuery({
    queryKey: ['hunts', 'feed'],
    queryFn: getActiveHuntsForFeed,
  });

  if (isLoading) {
    return (
      <ThemedView style={styles.centered} testID="hunts-feed-loading">
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedView style={styles.centered} testID="hunts-feed-error">
        <ThemedCustomText variant="body">Unable to load hunts. Pull to refresh.</ThemedCustomText>
      </ThemedView>
    );
  }

  return (
    <FlatList
      testID="hunts-feed"
      data={hunts}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <ThemedCustomText variant="h2" style={styles.heading}>
          Active Hunts
        </ThemedCustomText>
      }
      ListEmptyComponent={
        <ThemedCustomText variant="body" testID="hunts-feed-empty">
          No active hunts right now.
        </ThemedCustomText>
      }
      renderItem={({ item }) => <HuntFeedItem hunt={item} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  heading: {
    marginBottom: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
