import { ThemedButton, ThemedCustomText } from '@components/themed';
import { type JoinableHunt, type JoinHuntPhase, useJoinHunt } from '@hooks/useJoinHunt';
import { useTheme } from '@providers/ThemeProvider';
import type { JoinHuntStage } from '@services/joinHunt';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEPS: Array<{ stage: Exclude<JoinHuntStage, 'success'>; label: string }> = [
  { stage: 'preparing', label: 'Prepare' },
  { stage: 'awaiting_signature', label: 'Sign' },
  { stage: 'submitting', label: 'Submit' },
  { stage: 'confirming', label: 'Confirm' },
];

const STAGE_COPY: Record<JoinHuntStage, string> = {
  preparing: 'Preparing registration…',
  awaiting_signature: 'Approve in your wallet…',
  submitting: 'Sending to Soroban…',
  confirming: 'Confirming on-chain…',
  success: 'Joined!',
};

const HELPER_COPY: Partial<Record<JoinHuntPhase, string>> = {
  connect: 'Connect a Stellar wallet via WalletConnect to register for this hunt.',
  connecting: 'Approve the connection in your wallet app.',
  wrong_network: 'Hunts run on Stellar Testnet. Switch networks to join.',
  ready: "You'll approve a Soroban registration transaction in your wallet.",
  joined: "You're registered. Your first clue is waiting.",
};

type ButtonConfig = {
  text: string;
  variant: 'primary' | 'secondary' | 'success';
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void | Promise<void>;
};

type JoinHuntButtonProps = {
  hunt: JoinableHunt | undefined;
  /** Called when the player taps the button after joining. */
  onStartHunt: () => void;
  onSwitchNetwork: () => void;
};

export function JoinHuntButton({ hunt, onStartHunt, onSwitchNetwork }: JoinHuntButtonProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { phase, stage, error, unavailableReason, join, connect } = useJoinHunt(hunt);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnectError(null);
    try {
      await connect();
    } catch (caught) {
      setConnectError(caught instanceof Error ? caught.message : 'Could not connect your wallet.');
    }
  };

  const button = ((): ButtonConfig => {
    switch (phase) {
      case 'unavailable':
        return { text: 'Join Hunt', variant: 'primary', disabled: true };
      case 'connect':
        return { text: 'Connect Wallet to Join', variant: 'primary', onPress: handleConnect };
      case 'connecting':
        return { text: 'Connecting Wallet…', variant: 'primary', loading: true };
      case 'wrong_network':
        return { text: 'Switch to Testnet', variant: 'secondary', onPress: onSwitchNetwork };
      case 'in_progress':
        return {
          text: stage ? STAGE_COPY[stage] : 'Joining…',
          variant: 'primary',
          loading: true,
        };
      case 'error':
        return { text: 'Try Again', variant: 'primary', onPress: join };
      case 'joined':
        return { text: 'Start Hunting', variant: 'success', onPress: onStartHunt };
      case 'ready':
      default:
        return { text: 'Join Hunt', variant: 'primary', onPress: join };
    }
  })();

  const helper =
    phase === 'unavailable'
      ? unavailableReason
      : phase === 'in_progress' && stage === 'awaiting_signature'
        ? 'Check your wallet app and approve the join request.'
        : HELPER_COPY[phase];
  const errorMessage =
    phase === 'error' ? error?.message : phase === 'connect' ? connectError : null;
  const activeStep = stage ? STEPS.findIndex((step) => step.stage === stage) : -1;

  return (
    <View
      testID="join-hunt-panel"
      style={[
        styles.panel,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      {phase === 'in_progress' ? (
        <View
          testID="join-hunt-progress"
          accessibilityRole="progressbar"
          accessibilityLabel="Join hunt progress"
          accessibilityHint="Steps to register for this hunt on Stellar"
          accessibilityValue={{ min: 0, max: STEPS.length, now: activeStep + 1 }}
          style={styles.steps}
        >
          {STEPS.map((step, index) => {
            const isDone = index < activeStep;
            const isActive = index === activeStep;
            return (
              <View key={step.stage} style={styles.step}>
                <View
                  style={[
                    styles.stepBar,
                    { backgroundColor: isDone || isActive ? colors.primary : colors.border },
                    isActive && styles.stepBarActive,
                  ]}
                />
                <ThemedCustomText
                  variant="caption"
                  weight={isActive ? '700' : '500'}
                  color={isActive ? 'primary' : 'text'}
                  style={!isActive && !isDone ? styles.stepPending : undefined}
                >
                  {step.label}
                </ThemedCustomText>
              </View>
            );
          })}
        </View>
      ) : null}

      {errorMessage ? (
        <View
          testID="join-hunt-error"
          accessibilityRole="alert"
          style={[
            styles.errorCard,
            { backgroundColor: colors.error + '12', borderColor: colors.error + '40' },
          ]}
        >
          <ThemedCustomText variant="body" color="error">
            {errorMessage}
          </ThemedCustomText>
        </View>
      ) : null}

      <ThemedButton
        testID="join-hunt-button"
        text={button.text}
        variant={button.variant}
        size="lg"
        fullWidth
        disabled={button.disabled ?? false}
        loading={button.loading ?? false}
        onPress={button.onPress ? () => void button.onPress?.() : undefined}
        accessibilityHint={helper ?? undefined}
        style={styles.button}
      />

      {helper ? (
        <ThemedCustomText variant="caption" style={styles.helper}>
          {helper}
        </ThemedCustomText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  steps: {
    flexDirection: 'row',
    gap: 8,
  },
  step: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
  },
  stepBar: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 2,
  },
  stepBarActive: {
    height: 6,
    borderRadius: 3,
  },
  stepPending: {
    opacity: 0.55,
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  button: {
    minHeight: 60,
    borderRadius: 16,
  },
  helper: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
