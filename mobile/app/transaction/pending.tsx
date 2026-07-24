import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedButton, ThemedCustomText, ThemedView } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';
import { usePlayerStore } from '@store/useStore';

const JOIN_STEPS = [
  'Transaction opened in wallet',
  'Waiting for approval from your wallet',
  'Broadcasting registration to Soroban',
  'Consensus reached. Your hunt slot is active',
];

const COMPLETE_STEPS = [
  'Proof-of-completion packaged for signing',
  'Waiting for wallet approval',
  'Submitting final proof to Soroban',
  'Consensus reached. Rewards are ready to dispatch',
];

export default function TransactionPendingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { action, huntId, huntTitle } = useLocalSearchParams<{
    action?: 'join' | 'complete';
    huntId?: string;
    huntTitle?: string;
  }>();
  const { updateClueIndex } = usePlayerStore();
  const [currentStep, setCurrentStep] = useState(0);

  const isCompletion = action === 'complete';
  const steps = useMemo(() => (isCompletion ? COMPLETE_STEPS : JOIN_STEPS), [isCompletion]);

  useEffect(() => {
    if (!steps.length) {
      return;
    }

    if (currentStep >= steps.length - 1) {
      const timeoutId = setTimeout(() => {
        if (isCompletion) {
          updateClueIndex(Number.MAX_SAFE_INTEGER);
          router.replace('/(tabs)/play');
          return;
        }

        router.replace(`/hunt/${huntId ?? ''}`);
      }, 900);

      return () => clearTimeout(timeoutId);
    }

    const timeoutId = setTimeout(() => {
      setCurrentStep((value) => value + 1);
    }, 850);

    return () => clearTimeout(timeoutId);
  }, [currentStep, huntId, isCompletion, router, steps.length, updateClueIndex]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '35' }]}>
        <ThemedCustomText variant="h2" color="primary" weight="800">
          Transaction pending
        </ThemedCustomText>
        <ThemedCustomText variant="body" style={styles.copy}>
          {huntTitle
            ? `${huntTitle} has been sent to your wallet and is waiting for approval and Soroban consensus.`
            : 'Your transaction has been sent to your wallet and is waiting for approval and Soroban consensus.'}
        </ThemedCustomText>
      </View>

      <View style={styles.timeline}>
        {steps.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          return (
            <View key={step} style={styles.timelineRow}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: isDone || isActive ? colors.primary : colors.border,
                    borderColor: isActive ? colors.primary : 'transparent',
                  },
                ]}
              />
              <View style={styles.timelineText}>
                <ThemedCustomText variant="label" weight="700" color={isActive ? 'primary' : 'text'}>
                  {isDone ? 'Completed' : isActive ? 'In progress' : 'Queued'}
                </ThemedCustomText>
                <ThemedCustomText variant="body">{step}</ThemedCustomText>
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.noticeCard, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '40' }]}>
        <ThemedCustomText variant="label" color="warning" weight="700">
          Keep this screen open
        </ThemedCustomText>
        <ThemedCustomText variant="body">
          Closing the wallet prompt before approval will interrupt the pending flow and your registration may not reach consensus.
        </ThemedCustomText>
      </View>

      <ThemedButton text="Back to hunts" variant="ghost" fullWidth onPress={() => router.replace('/(tabs)/hunts')} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  copy: {
    opacity: 0.82,
  },
  timeline: {
    gap: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 3,
  },
  timelineText: {
    flex: 1,
    gap: 4,
  },
  noticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
});