import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { StoredHunt } from '@hunty/types';
import { ThemedCustomText, ThemedView } from '@components/themed';
import type { StoredHunt } from '@lib/types';
import { useTheme } from '@providers/ThemeProvider';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

interface HuntFeedItemProps {
  hunt: StoredHunt;
}

export function HuntFeedItem({ hunt }: HuntFeedItemProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      testID={`hunt-feed-item-${hunt.id}`}
      accessibilityLabel={`Open hunt ${hunt.title}`}
      onPress={() => router.push(`/hunt/${hunt.id}`)}
    >
      <ThemedView style={[styles.card, { borderColor: colors.border }]}>
        <ThemedCustomText variant="h3">{hunt.title}</ThemedCustomText>
        <ThemedCustomText variant="body" numberOfLines={2}>
          {hunt.description}
        </ThemedCustomText>
        <ThemedCustomText variant="caption">
          {hunt.cluesCount} clues · {hunt.rewardType} reward
        </ThemedCustomText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
});
