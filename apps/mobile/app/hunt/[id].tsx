import { HuntCoverImage } from '@components/HuntCoverImage';
import { JoinHuntButton } from '@components/JoinHuntButton';
import { ThemedCustomText, ThemedView } from '@components/themed';
import { getHuntById } from '@store/huntStore';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

export default function HuntDetailScreen() {
  const router = useRouter();
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
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <HuntCoverImage src={hunt.coverImageCid} alt={hunt.title} />
        <ThemedCustomText variant="h2">{hunt.title}</ThemedCustomText>
        <ThemedCustomText variant="body">{hunt.description}</ThemedCustomText>
      </ScrollView>

      {/* Anchored to the bottom so the primary action stays in thumb reach. */}
      <JoinHuntButton
        hunt={hunt}
        onStartHunt={() => router.push('/(tabs)/play')}
        onSwitchNetwork={() => router.push('/network/switch')}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flexGrow: 1, padding: 16, gap: 12 },
});
