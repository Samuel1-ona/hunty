import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getHuntById } from '@store/huntStore';
import { ThemedCustomText, ThemedView } from '@components/themed';
import { HuntCoverImage } from '@components/HuntCoverImage';

export default function HuntDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const huntId = Number(id);

  const { data: hunt, isLoading } = useQuery({
    queryKey: ['hunt', huntId],
    queryFn: () => getHuntById(huntId),
    enabled: Number.isFinite(huntId),
  });

  if (isLoading || !hunt) {
    return (
      <ThemedView style={styles.container}>
        <ThemedCustomText variant="body">Loading…</ThemedCustomText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <HuntCoverImage src={hunt.coverImageCid} alt={hunt.title} />
      <ThemedCustomText variant="h2">{hunt.title}</ThemedCustomText>
      <ThemedCustomText variant="body">{hunt.description}</ThemedCustomText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
});
