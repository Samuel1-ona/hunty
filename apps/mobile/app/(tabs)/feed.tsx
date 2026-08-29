import 'react-native-get-random-values';
import { useEffect, useState, StyleSheet } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import * as Application from 'expo-application';
import { ThemedView } from '@components/themed';
import { useHaptics } from '@hooks/useHaptics';
import { useTheme } from '@providers/ThemeProvider';
import { useToast } from '@providers/ToastProvider';
import { useWalletStore } from '@store/useStore';
import { OptimizedHuntFeed } from '@components/OptimizedHuntFeed';

export default function FeedScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const { network } = useWalletStore();
  const [pkey] = useState<string>('GD72EF...FH3W9A');

  const [accessibilityMode, setAccessibilityMode] = useState(false);

  const iosInstallDate = Application.getIosIdForVendorAsync ?? undefined;

  useEffect(() => {
    if (Platform.OS === 'ios' && iosInstallDate) {
      iosInstallDate().then((id) => {
        if (!id) {
          showToast({
            message: 'Enable Vendor ID in Privacy Settings for full app functionality.',
            type: 'warning',
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (network === 'mainnet') {
      showToast({
        message: 'Connected to Mainnet: some features are limited. Switch to Testnet.',
        type: 'warning',
        duration: 5000,
      });
    }
  }, [network]);

  const handleRefresh = async () => {
    haptics.triggerNotification('success');
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.filterBar}>
        <Text style={[styles.filterLabel, { color: colors.text }]}>Accessibility Mode</Text>
        <Switch
          value={accessibilityMode}
          onValueChange={setAccessibilityMode}
          trackColor={{ false: colors.border ?? '#767577', true: colors.primary ?? '#81b0ff' }}
          thumbColor={accessibilityMode ? colors.primary ?? '#81b0ff' : '#f4f3f4'}
          accessibilityLabel="Enable accessibility mode for remote playable hunts"
        />
      </View>
      <View style={styles.feedContainer}>
        <OptimizedHuntFeed onRefresh={handleRefresh} accessibilityMode={accessibilityMode} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  filterLabel: {
    fontSize: 16,
  },
  feedContainer: {
    flex: 1,
  },
});
