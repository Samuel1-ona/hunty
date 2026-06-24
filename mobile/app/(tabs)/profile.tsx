import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedButton, ThemedCustomText, ThemedView } from '@components/themed';
import { EmptyState } from '@components/EmptyState';
import { HuntyRefreshControl } from '@components/HuntyRefreshControl';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletStore } from '@store/useStore';
import { formatISOString } from '@lib/dateUtils';
import type { NftRewardDetail, PlayerHuntProgress, ProfileSummary } from '@lib/types';

type Colors = ReturnType<typeof useTheme>['colors'];

function shortenAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

async function fetchPlayerHunts(address: string): Promise<PlayerHuntProgress[]> {
  if (!address) return [];
  return [
    {
      id: 1,
      title: 'City Secrets',
      description: 'Race across town to uncover hidden murals and landmarks.',
      totalClues: 5,
      status: 'Completed',
      pointsEarned: 12,
      startedAt: '2026-02-10T14:32:00Z',
      completedAt: '2026-02-10T15:12:00Z',
    },
    {
      id: 2,
      title: 'Campus Quest',
      description: 'Solve riddles scattered around campus before the timer ends.',
      totalClues: 7,
      status: 'In-Progress',
      pointsEarned: 4,
      startedAt: '2026-02-18T17:05:00Z',
    },
  ];
}

async function fetchPlayerRewards(address: string): Promise<NftRewardDetail[]> {
  if (!address) return [];
  return [
    {
      id: 1,
      name: 'Golden Compass',
      description: 'Awarded to those who uncover all secret murals.',
      imageUri: '/static-images/nft1.png',
      earnedAt: '2026-02-10T15:16:00Z',
      claimed: true,
      huntName: 'City Secrets',
    },
    {
      id: 2,
      name: 'Explorer Trophy',
      description: 'Granted for completing a hunt within the time limit.',
      imageUri: '/static-images/nft2.png',
      earnedAt: '2026-02-20T11:26:00Z',
      claimed: false,
      huntName: 'Office Onboarding',
    },
  ];
}

function StatPill({
  label,
  value,
  colors,
}: {
  label: string;
  value: number;
  colors: Colors;
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <ThemedCustomText variant="caption" style={styles.statLabel}>
        {label}
      </ThemedCustomText>
      <ThemedCustomText variant="body" weight="700" style={styles.statValue}>
        {value}
      </ThemedCustomText>
    </View>
  );
}

function HuntCard({ hunt, colors }: { hunt: PlayerHuntProgress; colors: Colors }) {
  const isCompleted = hunt.status === 'Completed';
  const statusColor = isCompleted ? colors.success : colors.warning;

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <ThemedCustomText variant="body" weight="700">
            {hunt.title}
          </ThemedCustomText>
          <ThemedCustomText variant="caption" style={styles.muted}>
            {hunt.description}
          </ThemedCustomText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
          <ThemedCustomText variant="caption" weight="700" style={{ color: statusColor }}>
            {isCompleted ? 'Completed' : 'In Progress'}
          </ThemedCustomText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <ThemedCustomText variant="caption">
          Clues: {hunt.pointsEarned}/{hunt.totalClues}
        </ThemedCustomText>
        <ThemedCustomText variant="caption">Points: {hunt.pointsEarned}</ThemedCustomText>
      </View>
      <ThemedCustomText variant="caption" style={styles.muted}>
        Started {formatISOString(hunt.startedAt)}
      </ThemedCustomText>
      {hunt.completedAt ? (
        <ThemedCustomText variant="caption" style={styles.muted}>
          Finished {formatISOString(hunt.completedAt)}
        </ThemedCustomText>
      ) : null}
      <ThemedButton text="View details" variant="ghost" size="sm" fullWidth />
    </View>
  );
}

function NftCard({ nft, colors }: { nft: NftRewardDetail; colors: Colors }) {
  return (
    <View style={[styles.nftCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.nftPreview, { backgroundColor: nft.claimed ? colors.success + '20' : colors.warning + '20' }]}>
        <View style={[styles.nftDot, { backgroundColor: nft.claimed ? colors.success : colors.warning }]} />
      </View>
      <View style={styles.nftContent}>
        <ThemedCustomText variant="caption" color="primary">
          {nft.huntName ?? 'Scavenger Hunt'}
        </ThemedCustomText>
        <ThemedCustomText variant="body" weight="700">
          {nft.name}
        </ThemedCustomText>
        <ThemedCustomText variant="caption" style={styles.muted}>
          #{nft.id.toString().padStart(4, '0')}
        </ThemedCustomText>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { walletAddress, isConnected, watchOnlyAddress } = useWalletStore();
  const [hunts, setHunts] = useState<PlayerHuntProgress[]>([]);
  const [nftRewards, setNftRewards] = useState<NftRewardDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAddress = isConnected ? walletAddress : watchOnlyAddress;
  const usingWatchOnly = !isConnected && Boolean(watchOnlyAddress);
  const displayAddress = activeAddress ? shortenAddress(activeAddress) : 'Not connected';

  const loadProfileData = useCallback(async () => {
    if (!activeAddress) {
      setHunts([]);
      setNftRewards([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [huntsData, rewardsData] = await Promise.all([
        fetchPlayerHunts(activeAddress),
        fetchPlayerRewards(activeAddress),
      ]);
      setHunts(huntsData);
      setNftRewards(rewardsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile data.');
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const summary = useMemo((): ProfileSummary => {
    const completedHunts = hunts.filter((hunt) => hunt.status === 'Completed').length;
    return {
      totalHunts: hunts.length,
      completedHunts,
      inProgressHunts: hunts.filter((hunt) => hunt.status === 'In-Progress').length,
      totalPoints: hunts.reduce((sum, hunt) => sum + hunt.pointsEarned, 0),
      completionRate: hunts.length ? Math.round((completedHunts / hunts.length) * 100) : 0,
      totalNftRewards: nftRewards.length,
      claimedNftRewards: nftRewards.filter((nft) => nft.claimed).length,
      unclaimedNftRewards: nftRewards.filter((nft) => !nft.claimed).length,
    };
  }, [hunts, nftRewards]);

  if (!activeAddress) {
    return (
      <EmptyState
        icon="👛"
        title="Connect your wallet"
        description="Your profile uses the connected Stellar address to load hunts played and points earned."
        action={{
          label: 'Go to Settings',
          onPress: () => router.push('/(tabs)/settings'),
        }}
      />
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<HuntyRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <ThemedCustomText variant="h2" style={styles.centeredBold}>
            Player Profile
          </ThemedCustomText>
          <ThemedCustomText variant="caption" style={styles.centeredCaption}>
            View your hunt history, progress, and total points earned.
          </ThemedCustomText>
          <View style={[styles.walletCard, { backgroundColor: colors.primary + '10', borderColor: colors.border }]}>
            <ThemedCustomText variant="caption" style={styles.walletLabel}>
              {usingWatchOnly ? 'Watch-only Address' : 'Connected Wallet'}
            </ThemedCustomText>
            <ThemedCustomText variant="label" weight="600" style={styles.walletAddress}>
              {displayAddress}
            </ThemedCustomText>
          </View>
        </View>

        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <ThemedCustomText variant="h3" style={styles.sectionTitle}>
                Summary Statistics
              </ThemedCustomText>
              <View style={styles.statsGrid}>
                <StatPill label="Total Hunts" value={summary.totalHunts} colors={colors} />
                <StatPill label="Completed" value={summary.completedHunts} colors={colors} />
                <StatPill label="In Progress" value={summary.inProgressHunts} colors={colors} />
                <StatPill label="Total Points" value={summary.totalPoints} colors={colors} />
                <StatPill label="NFT Rewards" value={summary.totalNftRewards} colors={colors} />
                <StatPill label="Completion %" value={summary.completionRate} colors={colors} />
              </View>
            </View>

            <View style={styles.section}>
              <ThemedCustomText variant="h3" style={styles.sectionTitle}>
                Digital Trophies
              </ThemedCustomText>
              <View style={styles.nftGrid}>
                {nftRewards.length === 0 ? (
                  <EmptyState
                    icon="🏆"
                    title="No trophies yet"
                    description="Complete your first hunt to earn NFT trophies and rewards."
                    action={{
                      label: 'Browse Hunts',
                      onPress: () => {},
                    }}
                  />
                ) : (
                  nftRewards.map((nft) => <NftCard key={nft.id} nft={nft} colors={colors} />)
                )}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedCustomText variant="h3" style={styles.sectionTitle}>
                Hunt History
              </ThemedCustomText>
              {error ? (
                <View style={[styles.errorCard, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
                  <ThemedCustomText variant="body" color="error">
                    {error}
                  </ThemedCustomText>
                </View>
              ) : null}
              <View style={styles.list}>
                {hunts.map((hunt) => (
                  <HuntCard key={hunt.id} hunt={hunt} colors={colors} />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 24 },
  header: { gap: 12 },
  walletCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  walletLabel: { opacity: 0.7, marginBottom: 4 },
  walletAddress: { fontFamily: 'monospace' },
  section: { gap: 12 },
  sectionTitle: { fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statPill: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statLabel: { opacity: 0.7, marginBottom: 4 },
  statValue: { fontSize: 24 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitleWrap: { flex: 1, gap: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  muted: { opacity: 0.7 },
  list: { gap: 12 },
  nftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  nftCard: { width: '47%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  nftPreview: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  nftDot: { width: 12, height: 12, borderRadius: 6 },
  nftContent: { padding: 12, gap: 4 },
  errorCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  centeredBold: { textAlign: 'center', fontWeight: '700' },
  centeredCaption: { textAlign: 'center', maxWidth: 300 },
  loadingContainer: { paddingVertical: 48, alignItems: 'center' },
});
