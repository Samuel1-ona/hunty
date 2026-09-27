import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@providers/ThemeProvider';
import { ThemedCustomText } from '@components/themed';

type ToastType = 'info' | 'success' | 'warning' | 'error';

type ToastInput = {
  message: string;
  type?: ToastType;
  durationMs?: number;
};

type ToastState = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_ICONS: Record<ToastType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const [toast, setToast] = useState<ToastState | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef = useRef(0);

  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  const clearTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    opacity.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) }, () => {
      runOnJS(setToast)(null);
      runOnJS(clearTimer)();
    });
    translateY.value = withTiming(-120, { duration: 250, easing: Easing.out(Easing.ease) });
  }, [opacity, translateY, clearTimer]);

  const showToast = useCallback(({ message, type = 'info', durationMs = 4200 }: ToastInput) => {
    clearTimer();
    const id = nextIdRef.current += 1;

    setToast({ id, message, type });

    translateY.value = -120;
    opacity.value = 0;

    translateY.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.back(1.5)),
    });
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });

    hideTimerRef.current = setTimeout(() => {
      hideToast();
    }, durationMs);
  }, [clearTimer, translateY, opacity, hideToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const typeColor =
    toast?.type === 'success'
      ? colors.success
      : toast?.type === 'warning'
        ? colors.warning
        : toast?.type === 'error'
          ? colors.error
          : colors.info;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <SafeAreaView pointerEvents="none" style={styles.overlay} edges={['top']}>
          <Animated.View style={[styles.toast, { backgroundColor: typeColor }, animatedStyle]}>
            <ThemedCustomText style={styles.icon}>
              {TOAST_ICONS[toast.type]}
            </ThemedCustomText>
            <ThemedCustomText variant="label" lightColor="#ffffff" darkColor="#ffffff" weight="700" style={styles.message}>
              {toast.message}
            </ThemedCustomText>
          </Animated.View>
        </SafeAreaView>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  toast: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    fontSize: 18,
  },
  message: {
    flex: 1,
  },
});

