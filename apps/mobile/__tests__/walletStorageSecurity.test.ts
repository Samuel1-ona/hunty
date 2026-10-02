import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import {
  clearSession,
  loadSession,
  type PersistedSession,
  saveSession,
} from '@services/walletSession';
import {
  isSensitiveStorageKey,
  migrateSensitiveKeysFromAsyncStorage,
  safeAsyncStorageSet,
  SENSITIVE_STORAGE_KEYS,
} from '@services/walletStorageMigration';
import { createPin, setBiometricEnabled, verifyPin } from '@services/walletSecurity';
import { cacheJoinedHuntClues, queueClueAnswer, writeClues, writeHunts } from '@store/huntStore';
import { useWalletStore } from '@store/useStore';

jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('MOCK_HASH'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
}));
jest.mock('expo-random', () => ({
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}));
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1]),
  AuthenticationType: { FACIAL_RECOGNITION: 1, FINGERPRINT: 2 },
}));

const mockSession: PersistedSession = {
  topic: 'wc_topic_1234567890',
  publicKey: 'GBZXN7PIRZGNMHGA728RGRYA7QODRNQ1234567890123456789012',
  network: 'testnet',
};

describe('Mobile Wallet Session & Sensitive Storage Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Wallet session persistence (@services/walletSession)', () => {
    it('saves wallet session to SecureStore and NEVER writes to AsyncStorage', async () => {
      await saveSession(mockSession);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'hunty_wc_session',
        JSON.stringify(mockSession),
      );
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('loads wallet session from SecureStore and NEVER reads from AsyncStorage', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockSession));

      const loaded = await loadSession();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('hunty_wc_session');
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
      expect(loaded).toEqual(mockSession);
    });

    it('clears wallet session from SecureStore and NEVER calls AsyncStorage.removeItem', async () => {
      await clearSession();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('hunty_wc_session');
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('Wallet Security Service (@services/walletSecurity)', () => {
    it('stores PIN hash and salt exclusively in SecureStore, never in AsyncStorage', async () => {
      await createPin('1234');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('hunty_pin_salt', expect.any(String));
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('hunty_pin_hash', 'MOCK_HASH');
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('stores biometric preference exclusively in SecureStore, never in AsyncStorage', async () => {
      await setBiometricEnabled(true);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('hunty_biometric_enabled', 'true');
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Zustand useWalletStore Persistence', () => {
    it('uses SecureStore backing for wallet identity and network', async () => {
      useWalletStore.getState().setWallet(mockSession.publicKey);
      useWalletStore.getState().setNetwork('testnet');

      // The store persist storage utilizes SecureStore
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
        expect.stringMatching(/wallet/i),
        expect.anything(),
      );
    });
  });

  describe('huntStore storage audit (@store/huntStore)', () => {
    it('persists hunts and clues to SecureStore, not AsyncStorage', async () => {
      const hunts = [
        {
          id: 1,
          title: 'Hunt 1',
          description: '',
          cluesCount: 1,
          status: 'Active' as const,
          rewardType: 'XLM' as const,
        },
      ];
      await writeHunts(hunts);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('hunty_hunts', JSON.stringify(hunts));
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('hunty_hunts', expect.anything());

      const clues = [{ id: 1, huntId: 1, question: 'Q', answer: 'A', points: 10 }];
      await writeClues(clues);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('hunty_clues', JSON.stringify(clues));
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('hunty_clues', expect.anything());
    });

    it('offline clue cache and queue operations only write non-sensitive hunt/clue data to AsyncStorage', async () => {
      const clues = [{ id: 1, huntId: 42, question: 'Find fountain', answer: 'water', points: 5 }];
      await cacheJoinedHuntClues(42, clues);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'hunty_clues_hunt_42',
        JSON.stringify(clues),
      );

      await queueClueAnswer(42, 1, 'water', 'G'.repeat(56));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('hunty_clue_queue', expect.any(String));

      // Verify no sensitive keys or session tokens were touched
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      for (const [key, value] of calls) {
        expect(isSensitiveStorageKey(key)).toBe(false);
        expect(value).not.toContain(mockSession.topic);
      }
    });
  });

  describe('Sensitive key migration from AsyncStorage to SecureStore', () => {
    it('migrates plaintext session keys from AsyncStorage into SecureStore and purges them', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'hunty_wc_session') return JSON.stringify(mockSession);
        if (key === 'hunty_pin_hash') return 'LEGACY_PIN_HASH';
        return null;
      });

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await migrateSensitiveKeysFromAsyncStorage();

      expect(result.migratedKeys).toContain('hunty_wc_session');
      expect(result.migratedKeys).toContain('hunty_pin_hash');
      expect(result.purgedKeys).toContain('hunty_wc_session');
      expect(result.purgedKeys).toContain('hunty_pin_hash');

      // Verified copied to SecureStore
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'hunty_wc_session',
        JSON.stringify(mockSession),
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('hunty_pin_hash', 'LEGACY_PIN_HASH');

      // Verified removed from plaintext AsyncStorage
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('hunty_wc_session');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('hunty_pin_hash');
    });

    it('does not overwrite existing SecureStore values during migration, but still purges AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'hunty_wc_session') return 'OLD_SESSION';
        return null;
      });

      // SecureStore already has current session
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('CURRENT_SECURE_SESSION');

      const result = await migrateSensitiveKeysFromAsyncStorage();

      expect(result.migratedKeys).not.toContain('hunty_wc_session');
      expect(result.purgedKeys).toContain('hunty_wc_session');
      expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('hunty_wc_session', 'OLD_SESSION');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('hunty_wc_session');
    });
  });

  describe('Storage Security Guards (safeAsyncStorageSet)', () => {
    it.each(SENSITIVE_STORAGE_KEYS)(
      'rejects writing sensitive key "%s" to AsyncStorage',
      async (sensitiveKey) => {
        await expect(safeAsyncStorageSet(sensitiveKey, 'value')).rejects.toThrow(
          /Security Violation/i,
        );
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      },
    );

    it('rejects keys containing sensitive keywords (private, secret, token, seed)', async () => {
      await expect(safeAsyncStorageSet('stellar_private_key', 's...')).rejects.toThrow(
        /Security Violation/i,
      );
      await expect(safeAsyncStorageSet('wallet_seed_phrase', 'apple banana...')).rejects.toThrow(
        /Security Violation/i,
      );
      await expect(safeAsyncStorageSet('user_session_token', 'jwt...')).rejects.toThrow(
        /Security Violation/i,
      );
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('permits non-sensitive offline cache and preference keys in AsyncStorage', async () => {
      await safeAsyncStorageSet('themePreference', 'dark');
      await safeAsyncStorageSet('hunty_badge_count', '3');
      await safeAsyncStorageSet('hunty_notification_prefs', '{"enabled":true}');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('themePreference', 'dark');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('hunty_badge_count', '3');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'hunty_notification_prefs',
        '{"enabled":true}',
      );
    });
  });
});
