import { SettingsRow } from '@components/settings/SettingsRow';
import { SettingsSection } from '@components/settings/SettingsSection';
import { useNotifications } from '@hooks/useNotifications';
import { useTheme } from '@providers/ThemeProvider';
import {
  DEFAULT_PREFERENCES,
  getPreferences,
  type NotificationPreferences,
  setPreferences,
} from '@services/notifications/notificationPreferences';
import { useWalletStore } from '@store/useStore';
import { cancelAllHuntExpiryNotifications } from '@utils/huntNotifications';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { enabled, permissionStatus, loading, toggle } = useNotifications();
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Hydrate the local copy, then replace it with the wallet-scoped server
  // copy. This makes the mobile screen reflect changes made on web or another
  // phone while retaining offline support.
  useEffect(() => {
    let cancelled = false;
    getPreferences(walletAddress || undefined).then((nextPrefs) => {
      if (!cancelled) setPrefs(nextPrefs);
    });
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  /** Persist a partial preference update. */
  const updatePref = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);

      if (!value && (key === 'enabled' || key === 'huntEvents')) {
        try {
          await cancelAllHuntExpiryNotifications();
        } catch {
          // Preference changes should still persist if a scheduled reminder
          // cannot be inspected on this device.
        }
      }

      await setPreferences(updated, walletAddress || undefined);
    },
    [prefs, walletAddress],
  );

  /** Handle the master toggle — requests OS permission when enabling. */
  const handleMasterToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        await toggle(true);
      }
      await updatePref('enabled', value);
    },
    [toggle, updatePref],
  );

  /** Open device notification settings (when permission is denied). */
  const openDeviceSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      void Linking.openURL('app-settings:');
    } else {
      void Linking.openSettings();
    }
  }, []);

  const categoryDisabled = !enabled || !prefs.enabled;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: colors.text }]}>Notifications</Text>
      <Text style={[styles.sub, { color: colors.secondary }]}>
        Choose which notifications you want to receive.
      </Text>

      {/* Master toggle */}
      <SettingsSection title="General">
        <SettingsRow
          icon="notifications-outline"
          label="All Notifications"
          description={
            prefs.enabled ? 'Receive notifications from Hunty' : 'All notifications are muted'
          }
          type="toggle"
          value={prefs.enabled}
          onToggle={handleMasterToggle}
        />
        {permissionStatus === 'denied' && (
          <SettingsRow
            icon="settings-outline"
            label="Device Permission"
            description="Permission denied — tap to open Settings"
            type="navigate"
            onPress={openDeviceSettings}
          />
        )}
      </SettingsSection>

      {/* Hunt events */}
      <SettingsSection title="Hunt Events">
        <SettingsRow
          icon="flag-outline"
          label="Hunt Start"
          description="When a hunt you joined begins"
          type="toggle"
          value={!categoryDisabled && prefs.huntEvents}
          onToggle={(v) => updatePref('huntEvents', v)}
        />
        <SettingsRow
          icon="timer-outline"
          label="Hunt Ending Soon"
          description="Reminder before a hunt ends"
          type="toggle"
          value={!categoryDisabled && prefs.huntEvents}
          onToggle={(v) => updatePref('huntEvents', v)}
        />
      </SettingsSection>

      {/* Rewards & Progress */}
      <SettingsSection title="Rewards & Progress">
        <SettingsRow
          icon="gift-outline"
          label="Rewards"
          description="When you earn XLM or NFT rewards"
          type="toggle"
          value={!categoryDisabled && prefs.rewards}
          onToggle={(v) => updatePref('rewards', v)}
        />
        <SettingsRow
          icon="checkmark-circle-outline"
          label="Correct Answers"
          description="When you solve a clue correctly"
          type="toggle"
          value={!categoryDisabled && prefs.rewards}
          onToggle={(v) => updatePref('rewards', v)}
        />
      </SettingsSection>

      {/* Social */}
      <SettingsSection title="Social">
        <SettingsRow
          icon="podium-outline"
          label="Leaderboard"
          description="When someone overtakes your rank"
          type="toggle"
          value={!categoryDisabled && prefs.social}
          onToggle={(v) => updatePref('social', v)}
        />
      </SettingsSection>

      {/* Achievements */}
      <SettingsSection title="Achievements">
        <SettingsRow
          icon="trophy-outline"
          label="Achievement Unlocked"
          description="When you unlock a new achievement"
          type="toggle"
          value={!categoryDisabled && prefs.achievements}
          onToggle={(v) => updatePref('achievements', v)}
        />
      </SettingsSection>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={[styles.loadingText, { color: colors.secondary }]}>
            Checking permissions…
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sub: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  loadingOverlay: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
  },
});
