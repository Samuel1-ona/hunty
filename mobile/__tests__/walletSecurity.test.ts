import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import * as Random from 'expo-random';
import {
  authenticateBiometric,
  authenticateWithFallback,
  changePin,
  createPin,
  getBiometricEnabled,
  getPinExists,
  getSupportedBiometricType,
  setBiometricEnabled,
  verifyPin,
} from '@services/walletSecurity';

jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('expo-crypto');
jest.mock('expo-random');

describe('walletSecurity service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects supported biometric type when hardware is available and enrolled', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);

    const type = await getSupportedBiometricType();
    expect(type).toBe('Face ID');
  });

  it('returns false for biometric authentication when unavailable', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

    const available = await authenticateBiometric();
    expect(available).toBe(false);
  });

  it('persists biometric preference in secure storage', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    await setBiometricEnabled(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('hunty_biometric_enabled', 'true');
  });

  it('creates and verifies a PIN correctly', async () => {
    const salt = 'abcdef0123456789';
    (Random.getRandomBytesAsync as jest.Mock).mockResolvedValue(new Uint8Array([171, 205, 239]));
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('EXPECTED_HASH');
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    const created = await createPin('1234');
    expect(created).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('hunty_pin_salt', expect.any(String));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('hunty_pin_hash', 'EXPECTED_HASH');

    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'hunty_pin_salt') return salt;
      if (key === 'hunty_pin_hash') return 'EXPECTED_HASH';
      return null;
    });

    const verified = await verifyPin('1234');
    expect(verified).toBe(true);
  });

  it('returns requiresPin when biometric fails but a PIN exists', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false });
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'hunty_biometric_enabled') return 'true';
      if (key === 'hunty_pin_hash') return 'HASH';
      return null;
    });

    const result = await authenticateWithFallback();
    expect(result.requiresPin).toBe(true);
    expect(result.authenticated).toBe(false);
  });
});
