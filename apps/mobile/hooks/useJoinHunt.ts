import { useHaptics } from '@hooks/useHaptics';
import { useMountedRef } from '@hooks/useMountedRef';
import type { HuntStatus } from '@hunty/types';
import { useToast } from '@providers/ToastProvider';
import { useWeb3 } from '@providers/Web3Provider';
import {
  isJoinHuntConfigured,
  JoinHuntError,
  joinHuntOnChain,
  type JoinHuntStage,
} from '@services/joinHunt';
import { joinHunt as recordJoinedHunt } from '@store/huntStore';
import { usePlayerStore, useWalletStore } from '@store/useStore';
import { useCallback, useRef, useState } from 'react';

/**
 * What the Join Hunt button should offer right now, in priority order:
 * an in-flight or finished join wins over wallet/network prerequisites.
 */
export type JoinHuntPhase =
  | 'unavailable'
  | 'connect'
  | 'connecting'
  | 'wrong_network'
  | 'ready'
  | 'in_progress'
  | 'error'
  | 'joined';

export type JoinableHunt = {
  id: number;
  title: string;
  status: HuntStatus;
};

export type UseJoinHuntResult = {
  phase: JoinHuntPhase;
  /** Current on-chain stage while `phase === 'in_progress'`. */
  stage: JoinHuntStage | null;
  error: JoinHuntError | null;
  /** Why joining is unavailable, when `phase === 'unavailable'`. */
  unavailableReason: string | null;
  transactionHash: string | null;
  join: () => Promise<void>;
  connect: () => Promise<void>;
};

function unavailableReasonFor(hunt: JoinableHunt | undefined): string | null {
  if (!hunt) return 'Hunt not found.';
  if (hunt.status !== 'Active') {
    return `This hunt is ${hunt.status.toLowerCase()} and not open to join.`;
  }
  if (!isJoinHuntConfigured()) return 'Joining is not available in this build.';
  return null;
}

export function useJoinHunt(hunt: JoinableHunt | undefined): UseJoinHuntResult {
  const { isConnected, isConnecting, publicKey, connect, signTransaction } = useWeb3();
  const network = useWalletStore((state) => state.network);
  const currentProgress = usePlayerStore((state) => state.currentProgress);
  const setProgress = usePlayerStore((state) => state.setProgress);
  const haptics = useHaptics();
  const { showToast } = useToast();
  const mountedRef = useMountedRef();

  const [stage, setStage] = useState<JoinHuntStage | null>(null);
  const [error, setError] = useState<JoinHuntError | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const isJoined =
    Boolean(hunt && publicKey) &&
    currentProgress?.hunt_id === hunt?.id &&
    currentProgress?.player === publicKey;
  const unavailableReason = unavailableReasonFor(hunt);
  const isBusy = stage !== null && stage !== 'success';

  let phase: JoinHuntPhase;
  if (isJoined || stage === 'success') phase = 'joined';
  else if (isBusy) phase = 'in_progress';
  else if (unavailableReason) phase = 'unavailable';
  else if (isConnecting) phase = 'connecting';
  else if (!isConnected || !publicKey) phase = 'connect';
  else if (network === 'mainnet') phase = 'wrong_network';
  else if (error) phase = 'error';
  else phase = 'ready';

  const join = useCallback(async () => {
    if (!hunt || inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);
    setStage('preparing');

    try {
      const result = await joinHuntOnChain({
        huntId: hunt.id,
        playerAddress: publicKey,
        signTransaction,
        onStage: (next) => {
          if (mountedRef.current) setStage(next);
        },
      });

      setProgress({
        hunt_id: hunt.id,
        player: publicKey,
        current_clue_index: 0,
        completed: false,
        reward_claimed: false,
      });
      // Schedules the local "hunt ending soon" reminder.
      void recordJoinedHunt(hunt.id).catch(() => undefined);

      haptics.joinSuccess();
      showToast({
        message: `You joined ${hunt.title}!`,
        type: 'success',
        txHash: result.transactionHash,
      });
      if (mountedRef.current) {
        setStage('success');
        setTransactionHash(result.transactionHash);
      }
    } catch (caught) {
      const joinError =
        caught instanceof JoinHuntError
          ? caught
          : new JoinHuntError(
              caught instanceof Error ? caught.message : 'Joining the hunt failed.',
              'NETWORK_ERROR',
            );
      haptics.triggerNotification(joinError.code === 'SIGNATURE_REJECTED' ? 'warning' : 'error');
      if (mountedRef.current) {
        setError(joinError);
        setStage(null);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [haptics, hunt, mountedRef, publicKey, setProgress, showToast, signTransaction]);

  return {
    phase,
    stage: isBusy ? stage : null,
    error,
    unavailableReason,
    transactionHash,
    join,
    connect,
  };
}
