import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedButton, ThemedCustomText, ThemedView } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';

export default function NetworkSwitchInstructionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.card, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '40' }]}> 
        <ThemedCustomText variant="h2" color="warning" weight="800">
          Switch wallet network
        </ThemedCustomText>
        <ThemedCustomText variant="body" style={styles.copy}>
          Hunty mobile transaction flows currently run on Stellar Testnet. Your wallet appears to be on Mainnet.
        </ThemedCustomText>
      </View>

      <View style={styles.steps}>
        <ThemedCustomText variant="label" weight="700">1. Open your wallet app settings.</ThemedCustomText>
        <ThemedCustomText variant="label" weight="700">2. Find Network and select Stellar Testnet.</ThemedCustomText>
        <ThemedCustomText variant="label" weight="700">3. Return to Hunty and retry the transaction.</ThemedCustomText>
      </View>

      <ThemedButton text="Go to Hunts" fullWidth onPress={() => router.replace('/(tabs)/hunts')} />
      <ThemedButton text="Open Settings" variant="ghost" fullWidth onPress={() => router.push('/(tabs)/settings')} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  copy: {
    opacity: 0.85,
  },
  steps: {
    gap: 12,
  },
});

