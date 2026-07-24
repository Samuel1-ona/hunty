import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedButton, ThemedCustomText, ThemedInput, ThemedView } from '@components/themed';
import { SettingsSection } from '@components/settings/SettingsSection';
import { SettingsRow } from '@components/settings/SettingsRow';
import { useTheme } from '@providers/ThemeProvider';
import { useToast } from '@providers/ToastProvider';
import { useWalletSecurity } from '@providers/WalletSecurityProvider';

export default function WalletSecurityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const {
    initialized,
    biometricAvailable,
    biometricType,
    biometricEnabled,
    pinSet,
    authError,
    enableBiometrics,
    disableBiometrics,
    setPin,
    updatePin,
    removePin,
    lock,
  } = useWalletSecurity();

  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);

  const biometricLabel = biometricAvailable ? biometricType ?? 'Biometric authentication' : 'Biometric authentication is unavailable';

  const canSavePin = pin.length >= 4 && pin === confirmPin;
  const canChangePin = !!currentPin && newPin.length >= 4;

  const handleToggleBiometrics = async () => {
    setIsSubmitting(true);
    try {
      if (biometricEnabled) {
        await disableBiometrics();
      } else {
        await enableBiometrics();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePin = async () => {
    setIsSubmitting(true);
    setOperationMessage(null);
    try {
      if (pin !== confirmPin) {
        setOperationMessage('PIN entries must match.');
        return;
      }

      const created = await setPin(pin);
      if (created) {
        setPinValue('');
        setConfirmPin('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePin = async () => {
    setIsSubmitting(true);
    setOperationMessage(null);
    try {
      const changed = await updatePin(currentPin, newPin);
      if (changed) {
        setCurrentPin('');
        setNewPin('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePin = async () => {
    setIsSubmitting(true);
    setOperationMessage(null);
    try {
      await removePin();
    } finally {
      setIsSubmitting(false);
    }
  };

  const description = useMemo(() => {
    if (!initialized) return 'Loading security settings…';
    if (!biometricAvailable) return 'Biometric authentication is not supported on this device.';
    if (!biometricEnabled) return `Use ${biometricLabel} to protect sensitive wallet actions.`;
    return `Enabled: ${biometricLabel}`;
  }, [initialized, biometricAvailable, biometricEnabled, biometricLabel]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedCustomText variant="h2" weight="800">
          Wallet Security
        </ThemedCustomText>
        <ThemedCustomText variant="body" style={styles.subtitle}>
          Protect your wallet actions with secure biometric unlock and a PIN fallback.
        </ThemedCustomText>

        <SettingsSection title="Biometric Authentication">
          <SettingsRow
            icon="finger-print-outline"
            label="Enable Biometric Authentication"
            description={description}
            type="toggle"
            value={biometricEnabled}
            onToggle={handleToggleBiometrics}
          />
          {biometricEnabled && biometricAvailable ? (
            <ThemedCustomText variant="caption">Detected biometric type: {biometricLabel}</ThemedCustomText>
          ) : null}
        </SettingsSection>

        <SettingsSection title="PIN Code Fallback">
          {pinSet ? (
            <>
              <ThemedCustomText variant="caption" style={styles.sectionCaption}>
                A PIN is available as a fallback when biometrics are unavailable or fail.
              </ThemedCustomText>
              <ThemedInput
                placeholder="Current PIN"
                secureTextEntry
                value={currentPin}
                onChangeText={setCurrentPin}
              />
              <ThemedInput
                placeholder="New PIN"
                secureTextEntry
                value={newPin}
                onChangeText={setNewPin}
              />
              <ThemedButton
                text="Change PIN"
                onPress={handleChangePin}
                disabled={!canChangePin}
                isLoading={isSubmitting}
              />
              <ThemedButton
                text="Remove PIN"
                variant="destructive"
                onPress={handleRemovePin}
                isLoading={isSubmitting}
              />
            </>
          ) : (
            <>
              <ThemedCustomText variant="caption" style={styles.sectionCaption}>
                Create a secure PIN for fallback access when biometrics are unavailable.
              </ThemedCustomText>
              <ThemedInput
                placeholder="New PIN"
                secureTextEntry
                value={pin}
                onChangeText={setPinValue}
              />
              <ThemedInput
                placeholder="Confirm PIN"
                secureTextEntry
                value={confirmPin}
                onChangeText={setConfirmPin}
              />
              <ThemedButton
                text="Save PIN"
                onPress={handleCreatePin}
                disabled={!canSavePin}
                isLoading={isSubmitting}
              />
            </>
          )}
          {operationMessage ? (
            <ThemedCustomText variant="caption" color="error" style={styles.errorText}>
              {operationMessage}
            </ThemedCustomText>
          ) : null}
          {authError ? (
            <ThemedCustomText variant="caption" color="error" style={styles.errorText}>
              {authError}
            </ThemedCustomText>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Active Protection">
          <ThemedButton text="Lock wallet now" variant="ghost" onPress={lock} fullWidth />
          <ThemedButton text="Back to Settings" variant="ghost" onPress={() => router.back()} fullWidth />
        </SettingsSection>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  subtitle: { opacity: 0.75 },
  sectionCaption: { opacity: 0.8, marginBottom: 12 },
  errorText: { marginTop: 8 },
});
