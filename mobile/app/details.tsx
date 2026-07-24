import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedCustomText, ThemedView } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';
import { getHuntById, getHuntClues } from '@store/huntStore';
import { usePlayerStore } from '@store/useStore';
import type { Clue, StoredHunt } from '@lib/types';
import { ClueMarkdownRenderer } from '@components/ClueMarkdownRenderer';

export default function DetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { huntId } = useLocalSearchParams<{ huntId?: string }>();
  const [hunt, setHunt] = useState<StoredHunt | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const { getCompletedClues } = usePlayerStore();

  const hId = Number(huntId);
  const completedClues = getCompletedClues(hId);
  const isComplete = clues.length > 0 && completedClues.size === clues.length;

  const progressPercent = useMemo(() => {
    if (clues.length === 0) return 0;
    return Math.round((completedClues.size / clues.length) * 100);
  }, [completedClues.size, clues.length]);

  const registeredPlayers = useMemo(() => Math.max(12, clues.length * 5 + hId), [clues.length, hId]);
  
  const prizePool = useMemo(() => {
    const xlm = Math.max(10, clues.length * 3);
    const nftCount = hunt?.rewardType === 'NFT' || hunt?.rewardType === 'Both' ? Math.max(1, Math.floor(clues.length / 3)) : 0;
    return { xlm, nftCount };
  }, [clues.length, hunt?.rewardType]);

  const creatorAddress = useMemo(() => {
    if (hunt?.creatorEmail) {
      const username = hunt.creatorEmail.split('@')[0] || 'creator';
      return `G${username.toUpperCase().slice(0, 5)}...${String(hId).padStart(4, '0')}`;
    }
    return `GHUNT...${String(hId).padStart(4, '0')}`;
  }, [hunt?.creatorEmail, hId]);

  useEffect(() => {
    Promise.all([getHuntById(hId), getHuntClues(hId)]).then(
      ([fetchedHunt, fetchedClues]) => {
        if (fetchedHunt) setHunt(fetchedHunt);
        setClues(fetchedClues);
      },
    );
  }, [hId]);

  const handleStart = () => router.push(`/nested?huntId=${hId}&clueIndex=0`);

  const handleResume = () => {
    const next = clues.findIndex((_, i) => !completedClues.has(i));
    router.push(`/nested?huntId=${hId}&clueIndex=${next >= 0 ? next : 0}`);
  };

  if (!hunt) return <View style={styles.container} />;

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.primary + '12', borderBottomColor: colors.border }]}>
          <ThemedCustomText variant="h2" weight="800" style={styles.title}>{hunt.title}</ThemedCustomText>
          <ThemedCustomText variant="caption" color="primary" weight="700" style={styles.status}>{hunt.status}</ThemedCustomText>
        </View>

        <View style={[styles.loreCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <ThemedCustomText variant="label" weight="700" style={styles.sectionTitle}>Hunt Lore</ThemedCustomText>
          <ThemedCustomText variant="body" style={styles.loreText}>
            {hunt.description} Follow the trail, unlock each clue, and race to claim the final reward before rival hunters do.
          </ThemedCustomText>
        </View>

        <View style={styles.metaContainer}>
          <View style={[styles.metaItem, { backgroundColor: colors.background, borderColor: colors.border }]}> 
            <ThemedCustomText variant="caption" style={styles.metaLabel}>Total Clues</ThemedCustomText>
            <ThemedCustomText variant="h3" color="primary" weight="700">{clues.length}</ThemedCustomText>
          </View>
          <View style={[styles.metaItem, { backgroundColor: colors.background, borderColor: colors.border }]}> 
            <ThemedCustomText variant="caption" style={styles.metaLabel}>Reward Type</ThemedCustomText>
            <ThemedCustomText variant="h3" color="primary" weight="700">{hunt.rewardType}</ThemedCustomText>
          </View>
          <View style={[styles.metaItem, { backgroundColor: colors.background, borderColor: colors.border }]}> 
            <ThemedCustomText variant="caption" style={styles.metaLabel}>Players</ThemedCustomText>
            <ThemedCustomText variant="h3" color="primary" weight="700">{registeredPlayers}</ThemedCustomText>
          </View>
          <View style={[styles.metaItem, { backgroundColor: colors.background, borderColor: colors.border }]}> 
            <ThemedCustomText variant="caption" style={styles.metaLabel}>Creator</ThemedCustomText>
            <ThemedCustomText variant="label" weight="700">{creatorAddress}</ThemedCustomText>
          </View>
        </View>

        <View style={[styles.prizeCard, { borderColor: colors.warning, backgroundColor: colors.warning + '12' }]}>
          <ThemedCustomText variant="label" weight="700" style={styles.sectionTitle}>Prize Breakdown</ThemedCustomText>
          <View style={styles.prizeRow}>
            <ThemedCustomText variant="body">XLM Pool</ThemedCustomText>
            <ThemedCustomText variant="label" weight="700" color="warning">{prizePool.xlm} XLM</ThemedCustomText>
          </View>
          <View style={styles.prizeRow}>
            <ThemedCustomText variant="body">NFT Rewards</ThemedCustomText>
            <ThemedCustomText variant="label" weight="700" color="warning">{prizePool.nftCount}</ThemedCustomText>
          </View>
        </View>

        {clues.length > 0 && (
          <View style={[styles.progressSection, { backgroundColor: colors.info + '12', borderLeftColor: colors.info }]}> 
            <ThemedCustomText variant="label" weight="700" style={styles.sectionTitle}>Your Progress</ThemedCustomText>
            <View style={styles.progressStats}>
              <ThemedCustomText variant="body" style={styles.progressText}>
                {completedClues.size} of {clues.length} clues solved ({progressPercent}%)
              </ThemedCustomText>
              <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}> 
                <View
                  style={[
                    styles.progressBar,
                    { width: `${progressPercent}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionButtonsContainer}>
          {completedClues.size === 0 ? (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleStart}
            >
              <ThemedCustomText variant="label" lightColor="#fff" darkColor="#fff" weight="700">Start Hunt</ThemedCustomText>
            </Pressable>
          ) : isComplete ? (
            <View style={[styles.completedContainer, { borderColor: colors.success, backgroundColor: colors.success + '12' }]}> 
              <ThemedCustomText variant="label" color="success" weight="700" style={styles.completedText}>Hunt Completed</ThemedCustomText>
              <Pressable
                style={[styles.secondaryButton, { backgroundColor: colors.primary }]}
                onPress={handleStart}
              >
                <ThemedCustomText variant="label" lightColor="#fff" darkColor="#fff" weight="700">Replay Hunt</ThemedCustomText>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleResume}
            >
              <ThemedCustomText variant="label" lightColor="#fff" darkColor="#fff" weight="700">Resume Hunt</ThemedCustomText>
            </Pressable>
          )}
        </View>

        {/* Clues list */}
        <View style={styles.cluesSection}>
          <ThemedCustomText variant="label" weight="700" style={styles.sectionTitle}>Clues ({completedClues.size}/{clues.length})</ThemedCustomText>
          <FlatList
            scrollEnabled={false}
            data={clues}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => {
              const isCompleted = completedClues.has(index);
              return (
                <View
                  style={[
                    styles.clueOverview,
                    { borderColor: isCompleted ? colors.success : colors.border, backgroundColor: isCompleted ? colors.success + '10' : colors.background },
                  ]}
                >
                  <ThemedCustomText variant="label" style={[styles.clueOverviewNum, isCompleted && { color: colors.success }]}> 
                    {isCompleted ? '✓' : '○'} #{index + 1}
                  </ThemedCustomText>
                  
                  {/* Render clue details elegantly via ClueMarkdownRenderer */}
                  <View style={styles.clueOverviewQuestionContainer}>
                    <ClueMarkdownRenderer text={item.question} />
                  </View>

                  <ThemedCustomText variant="caption" color="warning" style={styles.cluePoints}>{item.points} pts</ThemedCustomText>
                </View>
              );
            }}
          />
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  title: {
    marginBottom: 6,
  },
  status: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    padding: 16,
    paddingBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  metaItem: {
    width: '47%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  metaLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontSize: 10,
    marginBottom: 4,
  },
  loreCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  loreText: {
    lineHeight: 20,
  },
  prizeCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  prizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    gap: 8,
  },
  sectionTitle: {
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  progressStats: {
    gap: 8,
  },
  progressText: {
    opacity: 0.85,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    width: '100%',
  },
  completedContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    gap: 8,
  },
  completedText: {
    fontSize: 15,
  },
  cluesSection: { paddingHorizontal: 16, paddingVertical: 12 },
  clueOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  clueOverviewNum: {
    minWidth: 30,
  },
  clueOverviewQuestionContainer: {
    flex: 1,
  },
  cluePoints: {
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  spacer: {
    height: 20,
  },
});
