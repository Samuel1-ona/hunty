import type { Clue } from '@hunty/types';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { ThemedCustomText } from '@/components/themed';
import { useBackgroundProximity } from '@/hooks/useBackgroundProximity';
import { BACKGROUND_LOCATION_RATIONALE } from '@/services/backgroundLocation';

type Props = {
  huntId: number;
  clues: Clue[];
  borderColor: string;
  primaryColor: string;
};

export function BackgroundLocationControl({ huntId, clues, borderColor, primaryColor }: Props) {
  const { enabled, busy, message, setBackgroundEnabled } = useBackgroundProximity(huntId, clues);

  const onToggle = (value: boolean) => {
    if (!value) {
      void setBackgroundEnabled(false);
      return;
    }

    Alert.alert('Background proximity alerts', BACKGROUND_LOCATION_RATIONALE, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Continue', onPress: () => void setBackgroundEnabled(true) },
    ]);
  };

  return (
    <View style={[styles.card, { borderColor }]}>
      <View style={styles.header}>
        <ThemedCustomText variant="label" weight="700">
          Background proximity alerts
        </ThemedCustomText>
        <Switch
          accessibilityLabel="Background proximity alerts"
          accessibilityHint="Alerts you after entering an active clue area while Hunty is closed"
          value={enabled}
          onValueChange={onToggle}
          disabled={busy || clues.length === 0}
          trackColor={{ false: '#cbd5e1', true: primaryColor }}
        />
      </View>
      <ThemedCustomText variant="caption" style={styles.copy}>
        {BACKGROUND_LOCATION_RATIONALE}
      </ThemedCustomText>
      {message ? (
        <ThemedCustomText variant="caption" color={enabled ? 'success' : 'warning'}>
          {message}
        </ThemedCustomText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  copy: { lineHeight: 18 },
});
