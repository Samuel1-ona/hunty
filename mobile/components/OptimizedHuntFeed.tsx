import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getActiveHuntsForFeed } from '@store/huntStore';
import { ThemedCustomText, ThemedView } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';
import { HuntyRefreshControl } from './HuntyRefreshControl';
import { FeedItemSkeleton } from './skeletons/FeedItemSkeleton';
import type { StoredHunt } from '@lib/types';

const PAGE_SIZE = 8;
const INITIAL_PAGE_SIZE = 6;
const SECTION_HEADER_HEIGHT = 54;
const HUNT_CARD_HEIGHT = 134;

type ListItem =
  | { kind: 'sectionHeader'; id: string; title: string; subtitle: string }
  | { kind: 'hunt'; id: string; hunt: StoredHunt };

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface OptimizedHuntFeedProps {
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

export function OptimizedHuntFeed({ onRefresh: externalRefresh, refreshing: externalRefreshing }: OptimizedHuntFeedProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList<ListItem>>(null);
  const [displayCount, setDisplayCount] = useState(INITIAL_PAGE_SIZE);
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const { data: hunts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['hunts', 'optimized-feed'],
    queryFn: getActiveHuntsForFeed,
  });

  const sections = useMemo(() => {
    const sortedTrending = [...hunts].sort((a, b) => (b.playerCount ?? 0) - (a.playerCount ?? 0)).slice(0, 4);
    const sortedNew = [...hunts].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 4);
    const sortedPrize = [...hunts].sort((a, b) => (b.rewardPool ?? 0) - (a.rewardPool ?? 0)).slice(0, 4);

    return [
      { title: 'Trending Hunts', subtitle: 'Most popular among players', data: sortedTrending },
      { title: 'Newly Created', subtitle: 'Latest hunts added', data: sortedNew },
      { title: 'Highest Prize', subtitle: 'Biggest reward pools', data: sortedPrize },
    ];
  }, [hunts]);

  const flatItems: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    let totalItems = 0;

    for (const section of sections) {
      if (section.data.length === 0) continue;
      if (totalItems >= displayCount) break;

      items.push({
        kind: 'sectionHeader',
        id: `section:${section.title}`,
        title: section.title,
        subtitle: section.subtitle,
      });
      totalItems++;

      if (totalItems > displayCount) break;

      const remaining = displayCount - totalItems;
      const itemsToShow = section.data.slice(0, remaining);

      for (const hunt of itemsToShow) {
        items.push({ kind: 'hunt', id: `hunt:${hunt.id}`, hunt });
        totalItems++;
        if (totalItems >= displayCount) break;
      }
    }

    return items;
  }, [sections, displayCount]);

  const hasMore = useMemo(() => {
    let total = 0;
    for (const section of sections) {
      total += 1 + section.data.length;
    }
    return displayCount < total;
  }, [sections, displayCount]);

  const isLoadingMore = isLoading && hunts.length === 0;

  const isRefreshing = externalRefreshing ?? localRefreshing;

  const handleRefresh = useCallback(async () => {
    setLocalRefreshing(true);
    setDisplayCount(INITIAL_PAGE_SIZE);
    if (externalRefresh) {
      await externalRefresh();
    } else {
      await refetch();
    }
    setLocalRefreshing(false);
  }, [externalRefresh, refetch]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setDisplayCount((prev) => prev + PAGE_SIZE);
  }, [hasMore, isLoadingMore]);

  const getItemLayout = useCallback(
    (data: ListItem[] | null | undefined, index: number) => {
      if (!data) return { length: 0, offset: 0, index };

      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += data[i].kind === 'sectionHeader' ? SECTION_HEADER_HEIGHT : HUNT_CARD_HEIGHT;
      }

      const length = data[index].kind === 'sectionHeader' ? SECTION_HEADER_HEIGHT : HUNT_CARD_HEIGHT;
      return { length, offset, index };
    },
    [],
  );

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === 'sectionHeader') {
        return (
          <View style={[styles.sectionHeader, { borderLeftColor: colors.primary }]}>
            <ThemedCustomText variant="h3" color="text" weight="700">
              {item.title}
            </ThemedCustomText>
            <ThemedCustomText variant="caption" color="text" style={styles.sectionSubtitle}>
              {item.subtitle}
            </ThemedCustomText>
          </View>
        );
      }

      const hunt = item.hunt;
      return (
        <Pressable
          onPress={() => router.push(`/hunt/${hunt.id}`)}
          accessibilityLabel={`Open hunt ${hunt.title}`}
        >
          <ThemedView style={[styles.card, { borderColor: colors.border }]}>
            {hunt.coverImageCid && (
              <Image
                source={{ uri: hunt.coverImageCid }}
                style={styles.coverImage}
                placeholder={{ blurhash }}
                contentFit="cover"
                recyclingKey={`hunt-cover-${hunt.id}`}
                cachePolicy="memory-disk"
                transition={200}
              />
            )}
            <View style={styles.cardContent}>
              <ThemedCustomText variant="h3" numberOfLines={1}>
                {hunt.title}
              </ThemedCustomText>
              <ThemedCustomText variant="body" numberOfLines={2}>
                {hunt.description}
              </ThemedCustomText>
              <ThemedCustomText variant="caption">
                {hunt.cluesCount} clues · {hunt.rewardType} reward
                {hunt.rewardPool ? ` · ${hunt.rewardPool} XLM` : ''}
                {hunt.playerCount ? ` · ${hunt.playerCount} players` : ''}
              </ThemedCustomText>
            </View>
          </ThemedView>
        </Pressable>
      );
    },
    [colors],
  );

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <FeedItemSkeleton />
        <FeedItemSkeleton />
      </View>
    );
  }, [hasMore]);

  if (isLoadingMore) {
    return (
      <ThemedView style={styles.centered} testID="optimized-feed-loading">
        <FeedItemSkeleton />
        <FeedItemSkeleton />
        <FeedItemSkeleton />
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedView style={styles.centered} testID="optimized-feed-error">
        <ThemedCustomText variant="body">Unable to load hunts. Pull to refresh.</ThemedCustomText>
      </ThemedView>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      testID="optimized-hunt-feed"
      data={flatItems}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      initialNumToRender={INITIAL_PAGE_SIZE}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <ThemedCustomText variant="h1" color="primary" weight="800">
            Home Feed
          </ThemedCustomText>
          <ThemedCustomText variant="body" color="text" style={styles.headerSubtitle}>
            Discover trending, new, and top prize hunts.
          </ThemedCustomText>
        </View>
      }
      ListEmptyComponent={
        <ThemedView style={styles.centered} testID="optimized-feed-empty">
          <ThemedCustomText variant="body">No active hunts right now.</ThemedCustomText>
        </ThemedView>
      }
      ListFooterComponent={renderFooter}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <HuntyRefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      }
      onContentSizeChange={() => {
        if (!hunts.length && !isLoading) {
          refetch();
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 32,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerSubtitle: {
    marginTop: 4,
    opacity: 0.8,
    fontSize: 15,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    borderLeftWidth: 3,
    marginLeft: 16,
    marginTop: 8,
    height: SECTION_HEADER_HEIGHT,
  },
  sectionSubtitle: {
    opacity: 0.6,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    height: HUNT_CARD_HEIGHT,
  },
  coverImage: {
    width: '100%',
    height: 72,
  },
  cardContent: {
    flex: 1,
    padding: 10,
    gap: 4,
  },
  footer: {
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
