import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedButton, ThemedCustomText, ThemedView } from '@components/themed';
import { useHaptics } from '@hooks/useHaptics';
import { useTheme } from '@providers/ThemeProvider';
import { useToast } from '@providers/ToastProvider';
import { getAllHunts } from '@store/huntStore';
import { usePlayerStore, useWalletStore } from '@store/useStore';
import type { StoredHunt } from '@lib/types';

function rewardLabel(hunt: StoredHunt) {
  if (hunt.rewardType === 'Both') return '100 XLM + NFT';
  if (hunt.rewardType === 'NFT') return 'Exclusive reward NFT';
  return '250 XLM';
}

export default function HuntsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const { network } = useWalletStore();
  const { currentProgress, setProgress } = usePlayerStore();
  const [hunts, setHunts] = useState<StoredHunt[]>([]);
  const [loadingHuntId, setLoadingHuntId] = useState<number | null>(null);

  useEffect(() => {
    getAllHunts()
      .then((data) => setHunts(data.filter((hunt) => hunt.status === 'Active')))
      .catch(() => setHunts([]));
  }, []);

  const stats = useMemo(
    () => [
      { value: String(hunts.length), label: 'Active Hunts', color: 'primary' as const },
      { value: '350+', label: 'XLM Pooled', color: 'secondary' as const },
      { value: '1.2k', label: 'Active Players', color: 'success' as const },
    ],
    [hunts.length],
  );

  const handleJoinHunt = (hunt: StoredHunt) => {
    if (loadingHuntId !== null) return;

    if (network === 'mainnet') {
      showToast({ message: 'Switch wallet to Stellar Testnet to join hunts.', type: 'warning' });
      router.push('/network/switch');
      return;
    }

    setLoadingHuntId(hunt.id);
    setProgress({
      hunt_id: hunt.id,
      player: 'GD72...3W9A',
      current_clue_index: 0,
      completed: false,
      reward_claimed: false,
    });

    router.push({
      pathname: '/transaction/pending',
      params: {
        action: 'join',
        huntId: String(hunt.id),
        huntTitle: hunt.title,
      },
    });
    setLoadingHuntId(null);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedCustomText variant="h1" color="primary" weight="800">
            Game Arcade
          </ThemedCustomText>
          <ThemedCustomText variant="body" color="text" style={styles.subtitle}>
            Embark on real-world treasure hunts, solve clues, and claim crypto rewards.
          </ThemedCustomText>
        </View>

        <View style={[styles.statsBoard, { backgroundColor: colors.border + '30', borderColor: colors.border }]}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={styles.statGroup}>
              {index > 0 ? <View style={[styles.statDivider, { backgroundColor: colors.border }]} /> : null}
              <View style={styles.statItem}>
                <ThemedCustomText variant="h2" color={stat.color} weight="700">
                  {stat.value}
                </ThemedCustomText>
                <ThemedCustomText variant="caption" color="text" style={styles.statLabel}>
                  {stat.label}
                </ThemedCustomText>
              </View>
            </View>
          ))}
        </View>

        <ThemedCustomText variant="h3" color="text" weight="700" style={styles.sectionTitle}>
          Featured Hunts
        </ThemedCustomText>

        <View style={styles.listContainer}>
          {hunts.map((hunt) => {
            const isCurrent = currentProgress?.hunt_id === hunt.id;
            const isLoading = loadingHuntId === hunt.id;

            return (
              <View
                key={hunt.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.background,
                    borderColor: isCurrent ? colors.success : colors.border,
                    shadowColor: isCurrent ? colors.success : '#000',
                  },
                ]}
              >
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: colors.info + '20' }]}>
                    <ThemedCustomText variant="caption" color="info" weight="700">
                      Active
                    </ThemedCustomText>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.secondary + '20' }]}>
                    <ThemedCustomText variant="caption" color="secondary" weight="700">
                      {hunt.rewardType}
                    </ThemedCustomText>
                  </View>
                </View>

                <ThemedCustomText variant="h3" color="text" weight="700" style={styles.cardTitle}>
                  {hunt.title}
                </ThemedCustomText>
                <ThemedCustomText variant="body" color="text" style={styles.cardDesc}>
                  {hunt.description}
                </ThemedCustomText>

                <View style={[styles.cardInfoRow, { borderTopColor: colors.border }]}>
                  <View style={styles.infoCol}>
                    <ThemedCustomText variant="caption" color="text" style={styles.infoLabel}>
                      Clues / Tasks
                    </ThemedCustomText>
                    <ThemedCustomText variant="body" color="text" weight="600">
                      {hunt.cluesCount} checkpoints
                    </ThemedCustomText>
                  </View>
                  <View style={styles.infoCol}>
                    <ThemedCustomText variant="caption" color="text" style={styles.infoLabel}>
                      Potential Reward
                    </ThemedCustomText>
                    <ThemedCustomText variant="body" color="primary" weight="700">
                      {rewardLabel(hunt)}
                    </ThemedCustomText>
                  </View>
                </View>

                <ThemedButton
                  text={isCurrent ? 'View Hunt' : isLoading ? 'Joining...' : 'Join Hunt'}
                  variant={isCurrent ? 'success' : 'primary'}
                  size="md"
                  fullWidth
                  disabled={isLoading || (!isCurrent && loadingHuntId !== null)}
                  loading={isLoading}
                  onPress={() => {
                    if (isCurrent) {
                      router.push(`/details?huntId=${hunt.id}`);
                    } else {
                      handleJoinHunt(hunt);
                    }
                  }}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  subtitle: { marginTop: 6, opacity: 0.8, fontSize: 15 },
  statsBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 28,
  },
  statGroup: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1, paddingVertical: 16 },
  statDivider: { width: 1, height: 32, opacity: 0.5 },
  statLabel: { opacity: 0.7 },
  sectionTitle: { marginBottom: 16 },
  listContainer: { gap: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  cardTitle: { marginBottom: 8 },
  cardDesc: { opacity: 0.7, marginBottom: 16, fontSize: 14 },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoCol: { flex: 1 },
  infoLabel: { opacity: 0.6 },
});
