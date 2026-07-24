import { FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getActiveHuntsNetworkFirst } from '@services/huntsApi';
import { ThemedCustomText, ThemedView } from '@components/themed';

export function GraphQLHuntsFeed() {
  const { data: hunts = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['hunts', 'graphql'],
    queryFn: getActiveHuntsNetworkFirst,
  });

  if (isLoading) {
    return (
      <ThemedView style={styles.centered} testID="graphql-hunts-loading">
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <FlatList
      testID="graphql-hunts-feed"
      data={hunts}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      refreshing={isRefetching}
      onRefresh={() => refetch()}
      ListHeaderComponent={
        <ThemedCustomText variant="h2" style={styles.heading}>
          Active Hunts {isError ? '(offline cache)' : '(indexer)'}
        </ThemedCustomText>
      }
      renderItem={({ item }) => (
        <ThemedView style={styles.card}>
          <ThemedCustomText variant="h3">{item.title}</ThemedCustomText>
          <ThemedCustomText variant="body" numberOfLines={2}>
            {item.description}
          </ThemedCustomText>
        </ThemedView>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  heading: { marginBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 12, gap: 6, borderRadius: 10 },
});
