import { act, renderHook, waitFor } from '@testing-library/react-native';

import { type JoinableHunt, useJoinHunt } from '@hooks/useJoinHunt';
import { usePlayerStore, useWalletStore } from '@store/useStore';

const PLAYER = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const TX_HASH = 'c'.repeat(64);

const mockWeb3 = {
  isConnected: true,
  isConnecting: false,
  publicKey: PLAYER,
  connect: jest.fn(),
  signTransaction: jest.fn(),
};
jest.mock('@providers/Web3Provider', () => ({ useWeb3: () => mockWeb3 }));

const mockShowToast = jest.fn();
jest.mock('@providers/ToastProvider', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const mockHaptics = { joinSuccess: jest.fn(), triggerNotification: jest.fn() };
jest.mock('@hooks/useHaptics', () => ({ useHaptics: () => mockHaptics }));

const mockJoinHuntOnChain = jest.fn();
const mockIsConfigured = jest.fn(() => true);
jest.mock('@services/joinHunt', () => {
  class JoinHuntError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    JoinHuntError,
    joinHuntOnChain: (...args: unknown[]) => mockJoinHuntOnChain(...args),
    isJoinHuntConfigured: () => mockIsConfigured(),
  };
});

const mockRecordJoinedHunt = jest.fn((_huntId: number) => Promise.resolve());
jest.mock('@store/huntStore', () => ({ joinHunt: (id: number) => mockRecordJoinedHunt(id) }));

const hunt: JoinableHunt = { id: 5, title: 'Soroban Sprint', status: 'Active' };

describe('useJoinHunt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockWeb3, { isConnected: true, isConnecting: false, publicKey: PLAYER });
    mockIsConfigured.mockReturnValue(true);
    useWalletStore.setState({ network: 'testnet' });
    usePlayerStore.setState({ currentProgress: null });
  });

  describe('phase', () => {
    it('is ready for a connected testnet wallet on an active hunt', () => {
      const { result } = renderHook(() => useJoinHunt(hunt));
      expect(result.current.phase).toBe('ready');
    });

    it('asks to connect when no wallet is connected', () => {
      Object.assign(mockWeb3, { isConnected: false, publicKey: '' });
      const { result } = renderHook(() => useJoinHunt(hunt));
      expect(result.current.phase).toBe('connect');
    });

    it('shows connecting while the wallet pairs', () => {
      Object.assign(mockWeb3, { isConnected: false, isConnecting: true, publicKey: '' });
      const { result } = renderHook(() => useJoinHunt(hunt));
      expect(result.current.phase).toBe('connecting');
    });

    it('requires testnet', () => {
      useWalletStore.setState({ network: 'mainnet' });
      const { result } = renderHook(() => useJoinHunt(hunt));
      expect(result.current.phase).toBe('wrong_network');
    });

    it('is unavailable for hunts that are not active', () => {
      const { result } = renderHook(() => useJoinHunt({ ...hunt, status: 'Draft' }));
      expect(result.current.phase).toBe('unavailable');
      expect(result.current.unavailableReason).toMatch(/draft/);
    });

    it('is unavailable when the contract is not configured', () => {
      mockIsConfigured.mockReturnValue(false);
      const { result } = renderHook(() => useJoinHunt(hunt));
      expect(result.current.phase).toBe('unavailable');
    });

    it('is joined when this wallet already has progress for the hunt', () => {
      usePlayerStore.setState({
        currentProgress: {
          hunt_id: 5,
          player: PLAYER,
          current_clue_index: 2,
          completed: false,
          reward_claimed: false,
        },
      });
      const { result } = renderHook(() => useJoinHunt(hunt));
      expect(result.current.phase).toBe('joined');
    });

    it('ignores progress recorded for a different wallet', () => {
      usePlayerStore.setState({
        currentProgress: {
          hunt_id: 5,
          player: 'GD72...3W9A',
          current_clue_index: 0,
          completed: false,
          reward_claimed: false,
        },
      });
      const { result } = renderHook(() => useJoinHunt(hunt));
      expect(result.current.phase).toBe('ready');
    });
  });

  describe('join', () => {
    it('signs with the connected wallet and records progress for its address', async () => {
      mockJoinHuntOnChain.mockImplementation(
        async ({ onStage }: { onStage: (stage: string) => void }) => {
          onStage('awaiting_signature');
          onStage('success');
          return { transactionHash: TX_HASH };
        },
      );
      const { result } = renderHook(() => useJoinHunt(hunt));

      await act(async () => {
        await result.current.join();
      });

      expect(mockJoinHuntOnChain).toHaveBeenCalledWith(
        expect.objectContaining({
          huntId: 5,
          playerAddress: PLAYER,
          signTransaction: mockWeb3.signTransaction,
        }),
      );
      expect(usePlayerStore.getState().currentProgress).toEqual({
        hunt_id: 5,
        player: PLAYER,
        current_clue_index: 0,
        completed: false,
        reward_claimed: false,
      });
      expect(mockRecordJoinedHunt).toHaveBeenCalledWith(5);
      expect(mockHaptics.joinSuccess).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', txHash: TX_HASH }),
      );
      expect(result.current.phase).toBe('joined');
      expect(result.current.transactionHash).toBe(TX_HASH);
    });

    it('reports in-progress stages', async () => {
      let release: () => void = () => undefined;
      mockJoinHuntOnChain.mockImplementation(
        ({ onStage }: { onStage: (stage: string) => void }) =>
          new Promise((resolve) => {
            onStage('awaiting_signature');
            release = () => resolve({ transactionHash: TX_HASH });
          }),
      );
      const { result } = renderHook(() => useJoinHunt(hunt));

      let joining: Promise<void> = Promise.resolve();
      act(() => {
        joining = result.current.join();
      });

      await waitFor(() => expect(result.current.phase).toBe('in_progress'));
      expect(result.current.stage).toBe('awaiting_signature');

      await act(async () => {
        release();
        await joining;
      });
      expect(result.current.phase).toBe('joined');
    });

    it('surfaces a failure without recording progress, and allows a retry', async () => {
      const { JoinHuntError } = jest.requireMock('@services/joinHunt');
      mockJoinHuntOnChain.mockRejectedValueOnce(
        new JoinHuntError('Transaction rejected in wallet.', 'SIGNATURE_REJECTED'),
      );
      const { result } = renderHook(() => useJoinHunt(hunt));

      await act(async () => {
        await result.current.join();
      });

      expect(result.current.phase).toBe('error');
      expect(result.current.error?.message).toBe('Transaction rejected in wallet.');
      expect(mockHaptics.triggerNotification).toHaveBeenCalledWith('warning');
      expect(usePlayerStore.getState().currentProgress).toBeNull();

      mockJoinHuntOnChain.mockResolvedValueOnce({ transactionHash: TX_HASH });
      await act(async () => {
        await result.current.join();
      });
      expect(result.current.phase).toBe('joined');
      expect(result.current.error).toBeNull();
    });

    it('wraps unexpected errors', async () => {
      mockJoinHuntOnChain.mockRejectedValueOnce(new Error('boom'));
      const { result } = renderHook(() => useJoinHunt(hunt));

      await act(async () => {
        await result.current.join();
      });

      expect(result.current.phase).toBe('error');
      expect(result.current.error?.message).toBe('boom');
      expect(mockHaptics.triggerNotification).toHaveBeenCalledWith('error');
    });

    it('ignores a second tap while a join is in flight', async () => {
      mockJoinHuntOnChain.mockImplementation(() => new Promise(() => undefined));
      const { result } = renderHook(() => useJoinHunt(hunt));

      act(() => {
        void result.current.join();
        void result.current.join();
      });

      expect(mockJoinHuntOnChain).toHaveBeenCalledTimes(1);
    });
  });
});
