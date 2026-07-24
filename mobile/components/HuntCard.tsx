import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { StoredHunt } from '@lib/types';
import { ThemedCustomText, ThemedView } from '@components/themed';
import { HuntCoverImage } from '@components/HuntCoverImage';
import { useTheme } from '@providers/ThemeProvider';

interface HuntCardProps {
  hunt: StoredHunt;
}

export function HuntCard({ hunt }: HuntCardProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${hunt.title}. ${hunt.description ?? ''}`}
      accessibilityHint="Opens hunt details"
      testID={`hunt-card-${hunt.id}`}
      onPress={() => router.push(`/hunt/${hunt.id}`)}
    >
      <ThemedView style={[styles.card, { borderColor: colors.border }]}>
        <HuntCoverImage
          src={hunt.coverImageCid ?? 'bafybeigdyrzt5sfp7udm7hmhd3km4gq6v2y24sqqew2qnp4o3k4xcoq2a'}
          alt={`${hunt.title} cover`}
        />
        <ThemedCustomText variant="h3">{hunt.title}</ThemedCustomText>
        <ThemedCustomText variant="body" numberOfLines={2}>
          {hunt.description}
        </ThemedCustomText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
});
