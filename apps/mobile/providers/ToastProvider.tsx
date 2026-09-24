import { ThemedCustomText } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';
import {
  createToastQueue,
  TOAST_DISMISS_LABEL,
  TOAST_VIEW_ACTION_LABEL,
  ToastVariant,
  type ToastInput,
  type ToastItem,
} from '@hunty/ui/toast';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type ToastContextValue = {
  showToast: (input: ToastInput & { type?: ToastVariant }) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_ICONS: Record<ToastVariant, string> = {
  [ToastVariant.Info]: 'ℹ️',
  [ToastVariant.Success]: '✅',
  [ToastVariant.Warning]: '⚠️',
  [ToastVariant.Error]: '❌',
};

function colorForVariant(
  variant: ToastVariant,
  colors: { success: string; warning: string; error: string; info: string },
): string {
  switch (variant) {
    case ToastVariant.Success:
      return colors.success;
    case ToastVariant.Warning:
      return colors.warning;
    case ToastVariant.Error:
      return colors.error;
    default:
      return colors.info;
  }
}

const ToastBanner: React.FC<{
  toast: ToastItem;
  backgroundColor: string;
  onDismiss: (id: number) => void;
}> = ({ toast, backgroundColor, onDismiss }) => {
  const handleDismiss = () => {
    onDismiss(toast.id);
  };

  const explorerUrl = toast.explorerUrl;

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOutDown.duration(200)}
      style={[styles.toast, { backgroundColor }]}
    >
      <ThemedCustomText style={styles.icon}>{TOAST_ICONS[toast.variant]}</ThemedCustomText>
      <ThemedCustomText
        variant="label"
        lightColor="#ffffff"
        darkColor="#ffffff"
        weight="700"
        style={styles.message}
      >
        {toast.message}
      </ThemedCustomText>
      {explorerUrl ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={TOAST_VIEW_ACTION_LABEL}
          onPress={() => {
            void Linking.openURL(explorerUrl);
          }}
          hitSlop={8}
        >
          <ThemedCustomText variant="label" lightColor="#ffffff" darkColor="#ffffff" weight="700">
            {TOAST_VIEW_ACTION_LABEL}
          </ThemedCustomText>
        </Pressable>
      ) : null}
      {toast.action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
          onPress={() => {
            toast.action?.onPress();
            handleDismiss();
          }}
          hitSlop={8}
        >
          <ThemedCustomText variant="label" lightColor="#ffffff" darkColor="#ffffff" weight="700">
            {toast.action.label}
          </ThemedCustomText>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={TOAST_DISMISS_LABEL}
        onPress={handleDismiss}
        hitSlop={8}
      >
        <ThemedCustomText variant="label" lightColor="#ffffff" darkColor="#ffffff" weight="700">
          ×
        </ThemedCustomText>
      </Pressable>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const queueRef = useRef(createToastQueue());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => queueRef.current.subscribe(setToasts), []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const clearTimer = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id: number) => {
      clearTimer(id);
      queueRef.current.dismiss(id);
    },
    [clearTimer],
  );

  const showToast = useCallback(
    (input: ToastInput & { type?: ToastVariant }) => {
      const { item, evicted } = queueRef.current.add(input);
      for (const dropped of evicted) {
        clearTimer(dropped.id);
      }

      if (item.durationMs > 0) {
        timersRef.current.set(
          item.id,
          setTimeout(() => {
            dismissToast(item.id);
          }, item.durationMs),
        );
      }
    },
    [clearTimer, dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 ? (
        <SafeAreaView pointerEvents="box-none" style={styles.overlay} edges={['bottom']}>
          {toasts.map((toast) => (
            <ToastBanner
              key={toast.id}
              toast={toast}
              backgroundColor={colorForVariant(toast.variant, colors)}
              onDismiss={dismissToast}
            />
          ))}
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
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
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
