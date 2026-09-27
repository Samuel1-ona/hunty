import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedButton, ThemedCustomText, ThemedView } from '@components/themed';
import { EmptyState } from '@components/EmptyState';
import { QRScanner } from '@components/QRScanner';
import { useTheme } from '@providers/ThemeProvider';
import { useHaptics } from '@hooks/useHaptics';
import { getHuntClues } from '@store/huntStore';
import { usePlayerStore, useWalletStore } from '@store/useStore';
import type { Clue } from '@lib/types';
import { verifyQrAgainstClue } from '@lib/qrCodeDecryptor';
import { matchesClueAnswer } from '@lib/clueAnswerVerification';
import { useToast } from '@providers/ToastProvider';
import { ClueMarkdownRenderer } from '@components/ClueMarkdownRenderer';
import { verifyClueGeofence } from '@/lib/locationGate';
import { usePlayerLocation } from '@app/hooks/usePlayerLocation';

export default function PlayScreen() {
  // Network status
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });
    return () => unsubscribe();
  }, []);

  const router = useRouter();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const { network } = useWalletStore();
  const {
    location,
    error: locationError,
    loading: locationLoading,
    permissionGranted,
    shareLocation,
    setShareLocation,
  } = usePlayerLocation();
  const {
    currentProgress,
    updateClueIndex,
    markCompleted,
    markClueCompleted,
    clearProgress,
  } = usePlayerStore();

  const [answer, setAnswer] = useState('');
  const [clues, setClues] = useState<Clue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState('');
  // Removed duplicate showToast declaration

  useEffect(() => {
    if (!currentProgress?.hunt_id) {
      setClues([]);
      return;
    }

    void getHuntClues(currentProgress.hunt_id).then(setClues);
  }, [currentProgress?.hunt_id]);

  if (!currentProgress?.hunt_id) {
    return (
      <EmptyState
        icon="🎯"
        title="Join a hunt first"
        description="Register for an active hunt from the Hunts tab to unlock clue progress and transaction steps."
        action={{
          label: 'Browse Hunts',
          onPress: () => router.push('/(tabs)/hunts'),
        }}
      />
    );
  }

  const activeClueIndex = currentProgress.current_clue_index;
  const activeClue = clues[activeClueIndex];
  const allSolved = activeClueIndex >= clues.length;

  const progressLabel = useMemo(() => {
    if (clues.length === 0) {
      return 'Loading clues...';
    }

    if (allSolved) {
      return 'All clues solved';
    }

    return `Clue ${activeClueIndex + 1} of ${clues.length}`;
  }, [activeClueIndex, allSolved, clues.length]);

  const submitClueAnswer = async (submittedAnswer: string, fromQr = false) => {
    if (!activeClue || !currentProgress?.hunt_id || isSubmitting) {
      return;
    }

    // If offline, queue the answer and update progress locally
    if (!isOnline) {
      await queueClueAnswer(currentProgress.hunt_id, activeClue.id, answer.trim());
      // Mark clue completed locally
      markClueCompleted(currentProgress.hunt_id, activeClueIndex);
      // Advance to next clue
      updateClueIndex(activeClueIndex + 1);
      setAnswer('');
      showToast({ message: 'Answer queued. It will be submitted when back online.', type: 'info' });
      return;
    }

    if (network === 'mainnet') {
      showToast({
        message: 'Switch wallet to Stellar Testnet before submitting final proof.',
        type: 'warning',
      });
      router.push('/network/switch');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const locationCheck = await verifyClueGeofence(activeClue);
      if (!locationCheck.allowed) {
        setError(locationCheck.reason);
        haptics.triggerNotification('error');
        return;
      }

      if (fromQr) {
        const qrCheck = await verifyQrAgainstClue(submittedAnswer, activeClue, currentProgress.hunt_id);
        if (!qrCheck.match) {
          showToast({ message: qrCheck.reason, type: 'error' });
          setError(qrCheck.reason);
          return;
        }
      } else if (!(await matchesClueAnswer(submittedAnswer, activeClue, currentProgress.hunt_id))) {
        setError('Incorrect answer. Review the clue and try again.');
        haptics.triggerNotification('error');
        return;
      }

      const isLastClue = activeClueIndex === clues.length - 1;
      markClueCompleted(currentProgress.hunt_id, activeClueIndex);

      if (isLastClue) {
        haptics.triggerImpact('heavy');
        markCompleted();
        router.push({
          pathname: '/transaction/pending',
          params: {
            action: 'complete',
            huntId: String(currentProgress.hunt_id),
            huntTitle: 'Reward Dispatch',
          },
        });
      } else {
        haptics.triggerNotification('success');
        updateClueIndex(activeClueIndex + 1);
      }

      setAnswer('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    await submitClueAnswer(answer);
  };

  const handleQrScan = async (data: string) => {
    await submitClueAnswer(data, true);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.primary + '10', borderColor: colors.border }]}>
          <ThemedCustomText variant="h2" color="primary" weight="800">
            Active Hunt Session
          </ThemedCustomText>
          <ThemedCustomText variant="body">{progressLabel}</ThemedCustomText>
        </View>

        <View style={[styles.locationCard, { backgroundColor: colors.background, borderColor: colors.border }]}> 
          <View style={styles.locationHeader}> 
            <ThemedCustomText variant="label" weight="700">
              Location services
            </ThemedCustomText>
            <Switch
              value={shareLocation}
              onValueChange={setShareLocation}
              disabled={!permissionGranted}
              trackColor={{ false: '#cbd5e1', true: colors.primary }}
            />
          </View>
          <ThemedCustomText variant="caption" style={styles.locationCopy}>
            {permissionGranted
              ? shareLocation
                ? 'GPS tracking is enabled for live geofence checks and low-power updates.'
                : 'Location sharing is paused. Clues can still be checked using a one-time GPS read.'
              : 'Allow location access to use location-based clues and geofencing.'}
          </ThemedCustomText>
          {locationLoading ? (
            <ThemedCustomText variant="caption" color="warning">
              Requesting location access…
            </ThemedCustomText>
          ) : null}
          {locationError ? (
            <ThemedCustomText variant="caption" color="error">
              {locationError}
            </ThemedCustomText>
          ) : null}
          {location ? (
            <ThemedCustomText variant="caption" style={styles.locationMeta}>
              Live coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </ThemedCustomText>
          ) : null}
        </View>

        {clues.map((clue, index) => {
          const isActive = index === activeClueIndex && !allSolved;
          const isUnlocked = index <= activeClueIndex;

          return (
            <View
              key={clue.id}
              style={[
                styles.clueCard,
                {
                  backgroundColor: isActive ? colors.primary + '12' : colors.background,
                  borderColor: isActive ? colors.primary : colors.border,
                  opacity: isUnlocked ? 1 : 0.55,
                },
              ]}
            >
              <ThemedCustomText variant="label" color={isActive ? 'primary' : 'text'} weight="700">
                {isActive ? 'Current clue' : isUnlocked ? 'Unlocked clue' : 'Locked clue'}
              </ThemedCustomText>
              
              {/* Render dynamic clue text elegantly with Markdown renderer */}
              <View style={styles.clueQuestion}>
                <ClueMarkdownRenderer text={clue.question} />
              </View>

              <ThemedCustomText variant="caption" style={styles.clueMeta}>
                {clue.points} pts {clue.hint ? `• Hint: ${clue.hint}` : ''}
              </ThemedCustomText>
            </View>
          );
        })}

        {!allSolved && activeClue ? (
        <>
          <OfflineBanner />
          <View style={[styles.answerPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ThemedCustomText variant="h3" weight="700">
              Submit answer
            </ThemedCustomText>
            <ThemedCustomText variant="caption" style={styles.answerCopy}>
              The final correct answer will move you into wallet approval and Soroban consensus.
            </ThemedCustomText>
            <TextInput
              value={answer}
              onChangeText={(value) => {
                setAnswer(value);
                if (error) {
                  setError('');
                }
              }}
              placeholder="Type the exact checkpoint answer"
              placeholderTextColor="#94a3b8"
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? (
              <ThemedCustomText variant="caption" color="error">
                {error}
              </ThemedCustomText>
            ) : null}
            <ThemedButton
              text={isSubmitting ? 'Checking GPS...' : 'Submit answer'}
              loading={isSubmitting}
              fullWidth
              onPress={handleSubmit}
            />
            <ThemedButton
              text="Scan QR checkpoint"
              variant="secondary"
              fullWidth
              onPress={() => setScannerOpen(true)}
            />
            <ThemedButton text="Abandon hunt" variant="ghost" fullWidth onPress={clearProgress} />
          </View>
        </>
        ) : null}
      </ScrollView>

      <QRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQrScan}
        title="Scan checkpoint QR"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  clueCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  clueQuestion: {
    marginTop: 4,
  },
  clueMeta: {
    opacity: 0.75,
  },
  locationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationCopy: {
    opacity: 0.8,
  },
  locationMeta: {
    opacity: 0.65,
  },
  answerPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  answerCopy: {
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyCopy: {
    textAlign: 'center',
  },
});
