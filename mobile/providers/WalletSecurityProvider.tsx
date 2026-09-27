import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useToast } from '@providers/ToastProvider';
import {
  authenticateWithFallback,
  authenticateBiometric,
  changePin,
  clearPin,
  createPin,
  getBiometricEnabled,
  getBiometricStatus,
  getPinExists,
  setBiometricEnabled,
  verifyPin,
  BiometricTypeName,
} from '@services/walletSecurity';

const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

export type WalletSecurityContextValue = {
  initialized: boolean;
  biometricAvailable: boolean;
  biometricType: BiometricTypeName;
  biometricEnabled: boolean;
  pinSet: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  authAttempts: number;
  refreshSecurityState: () => Promise<void>;
  enableBiometrics: () => Promise<boolean>;
  disableBiometrics: () => Promise<void>;
  setPin: (pin: string) => Promise<boolean>;
  updatePin: (currentPin: string, newPin: string) => Promise<boolean>;
  removePin: () => Promise<void>;
  authenticate: (reason?: string) => Promise<{ authenticated: boolean; requiresPin: boolean }>;
  verifyPinCode: (pin: string) => Promise<boolean>;
  lock: () => void;
};

const WalletSecurityContext = createContext<WalletSecurityContextValue | undefined>(undefined);

export function WalletSecurityProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [initialized, setInitialized] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricTypeName>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authAttempts, setAuthAttempts] = useState(0);
  const [lastActiveAt, setLastActiveAt] = useState(Date.now());

  const refreshSecurityState = async () => {
    try {
      const status = await getBiometricStatus();
      const pinExists = await getPinExists();
      setBiometricAvailable(status.available);
      setBiometricType(status.type);
      setBiometricEnabledState(status.enabled);
      setPinSet(pinExists);
    } catch {
      setAuthError('Failed to load security settings.');
    } finally {
      setInitialized(true);
    }
  };

  useEffect(() => {
    void refreshSecurityState();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        setLastActiveAt(Date.now());
        setIsAuthenticated(false);
      }

      if (nextState === 'active') {
        if (Date.now() - lastActiveAt >= AUTH_TIMEOUT_MS) {
          setIsAuthenticated(false);
        }
      }
    });

    return () => subscription.remove();
  }, [lastActiveAt]);

  const enableBiometrics = async () => {
    if (!biometricAvailable) {
      setAuthError('Biometric authentication is not available on this device.');
      return false;
    }

    const success = await authenticateBiometric('Enable biometric auth for Hunty');
    if (!success) {
      setAuthError('Biometric authentication was canceled or failed.');
      return false;
    }

    await setBiometricEnabled(true);
    await refreshSecurityState();
    showToast({ message: 'Biometric authentication enabled.', type: 'success' });
    return true;
  };

  const disableBiometrics = async () => {
    await setBiometricEnabled(false);
    await refreshSecurityState();
    showToast({ message: 'Biometric authentication disabled.', type: 'info' });
  };

  const setPin = async (pin: string) => {
    const created = await createPin(pin);
    if (created) {
      await refreshSecurityState();
      showToast({ message: 'PIN code saved securely.', type: 'success' });
    } else {
      setAuthError(`PIN must be at least ${4} digits.`);
    }
    return created;
  };

  const updatePin = async (currentPin: string, newPin: string) => {
    const changed = await changePin(currentPin, newPin);
    if (changed) {
      await refreshSecurityState();
      showToast({ message: 'PIN code updated successfully.', type: 'success' });
    } else {
      setAuthError('Current PIN is incorrect, or new PIN is invalid.');
    }
    return changed;
  };

  const removePin = async () => {
    await clearPin();
    await refreshSecurityState();
    showToast({ message: 'PIN code removed.', type: 'info' });
  };

  const verifyPinCode = async (pin: string) => {
    const verified = await verifyPin(pin);
    if (verified) {
      setAuthAttempts(0);
      setIsAuthenticated(true);
      return true;
    }

    setAuthAttempts((prev) => prev + 1);
    setAuthError('PIN is incorrect.');
    return false;
  };

  const authenticate = async (reason = 'Confirm wallet action'): Promise<{ authenticated: boolean; requiresPin: boolean }> => {
    setAuthError(null);

    if (isAuthenticated) {
      return { authenticated: true, requiresPin: false };
    }

    const result = await authenticateWithFallback(reason);
    if (result.authenticated) {
      setIsAuthenticated(true);
      setAuthAttempts(0);
      return result;
    }

    if (result.requiresPin && pinSet) {
      setAuthAttempts((prev) => prev + 1);
      return result;
    }

    setAuthError('Authentication is required to continue.');
    return result;
  };

  const lock = () => {
    setIsAuthenticated(false);
  };

  const value = useMemo(
    () => ({
      initialized,
      biometricAvailable,
      biometricType,
      biometricEnabled,
      pinSet,
      isAuthenticated,
      authError,
      authAttempts,
      refreshSecurityState,
      enableBiometrics,
      disableBiometrics,
      setPin,
      updatePin,
      removePin,
      authenticate,
      verifyPinCode,
      lock,
    }),
    [
      initialized,
      biometricAvailable,
      biometricType,
      biometricEnabled,
      pinSet,
      isAuthenticated,
      authError,
      authAttempts,
    ],
  );

  return <WalletSecurityContext.Provider value={value}>{children}</WalletSecurityContext.Provider>;
}

export function useWalletSecurity(): WalletSecurityContextValue {
  const context = useContext(WalletSecurityContext);
  if (!context) {
    throw new Error('useWalletSecurity must be used within WalletSecurityProvider');
  }
  return context;
}
