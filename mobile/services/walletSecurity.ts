import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import * as Random from 'expo-random';

export type BiometricTypeName = 'Face ID' | 'Touch ID' | 'Face Unlock' | 'Fingerprint' | null;

const BIOMETRIC_ENABLED_KEY = 'hunty_biometric_enabled';
const BIOMETRIC_TYPE_KEY = 'hunty_biometric_type';
const PIN_HASH_KEY = 'hunty_pin_hash';
const PIN_SALT_KEY = 'hunty_pin_salt';

export type WalletAuthResult = {
  authenticated: boolean;
  requiresPin: boolean;
  reason?: string;
};

const PIN_MIN_LENGTH = 4;

function normalizeBoolean(value: string | null): boolean {
  return value === 'true';
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function getSupportedBiometricType(): Promise<BiometricTypeName> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) {
    return null;
  }

  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }

  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }

  return null;
}

export async function isBiometricAvailable(): Promise<boolean> {
  return (await getSupportedBiometricType()) !== null;
}

export async function authenticateBiometric(promptMessage = 'Unlock Hunty Wallet'): Promise<boolean> {
  const isAvailable = await isBiometricAvailable();
  if (!isAvailable) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: true,
  });

  return result.success;
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');

  if (enabled) {
    const currentType = await getSupportedBiometricType();
    if (currentType) {
      await SecureStore.setItemAsync(BIOMETRIC_TYPE_KEY, currentType);
    }
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_TYPE_KEY);
  }
}

export async function getBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return normalizeBoolean(value);
}

export async function getStoredBiometricType(): Promise<BiometricTypeName> {
  const stored = await SecureStore.getItemAsync(BIOMETRIC_TYPE_KEY);
  return stored ? (stored as BiometricTypeName) : null;
}

export async function createPin(pin: string): Promise<boolean> {
  if (typeof pin !== 'string' || pin.length < PIN_MIN_LENGTH) {
    return false;
  }

  const saltBytes = await Random.getRandomBytesAsync(16);
  const salt = toHex(saltBytes);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  return true;
}

export async function changePin(currentPin: string, newPin: string): Promise<boolean> {
  const valid = await verifyPin(currentPin);
  if (!valid) return false;
  return createPin(newPin);
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_SALT_KEY);
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
}

export async function getPinExists(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return Boolean(hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
  const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!salt || !storedHash) return false;

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  return storedHash === hash;
}

export async function authenticateWithFallback(promptMessage = 'Unlock Hunty Wallet'): Promise<WalletAuthResult> {
  const biometricEnabled = await getBiometricEnabled();
  const biometricAvailable = await isBiometricAvailable();
  const pinExists = await getPinExists();

  if (biometricEnabled && biometricAvailable) {
    const success = await authenticateBiometric(promptMessage);
    if (success) {
      return { authenticated: true, requiresPin: false };
    }

    return { authenticated: false, requiresPin: pinExists };
  }

  if (pinExists) {
    return { authenticated: false, requiresPin: true };
  }

  return { authenticated: false, requiresPin: false };
}

export async function getBiometricStatus(): Promise<{ available: boolean; enabled: boolean; type: BiometricTypeName }> {
  const available = await isBiometricAvailable();
  const enabled = await getBiometricEnabled();
  const type = available ? await getSupportedBiometricType() : null;
  return { available, enabled, type };
}
