import '../global.css';
import { useSyncQueue } from '@hooks/useSyncQueue';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, type ErrorBoundaryProps, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hideSplashScreen, initializeSplashScreen } from '@utils/splashScreenManager';
import { useTheme } from '@providers/ThemeProvider';
import { ThemedCustomText, ThemedButton } from '@components/themed';
import ReactQueryProvider from '@providers/ReactQueryProvider';
import { ToastProvider, useToast } from '@providers/ToastProvider';
import { Web3Provider } from '@providers/Web3Provider';
import { WalletSecurityProvider } from '@providers/WalletSecurityProvider';
import { ModalProvider } from '@providers/ModalProvider';
import { NotificationsProvider } from '@providers/NotificationsProvider';
import { useBackHandler } from '@hooks/useBackHandler';
import { MemoryDiagnosticsOverlay } from '@components/MemoryDiagnosticsOverlay';
import { StackHeader } from '@components/navigation/StackHeader';
import { Sentry, initializeSentry } from '@config/sentry';
import { classifyWalletTxError } from '@/lib/walletErrors';
import { useWalletStore } from '@store/useStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  initialRouteName: '(tabs)',
};
initializeSplashScreen();
initializeSentry();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'right', 'bottom', 'left']}
      >
        <View style={styles.errorContainer}>
          <ThemedCustomText variant="h2" style={styles.errorTitle}>
            Something went wrong
          </ThemedCustomText>
          <ThemedCustomText variant="body" style={styles.centered}>
            {error.message || 'Unexpected navigation error.'}
          </ThemedCustomText>
          <ThemedButton
            text="Try again"
            onPress={retry}
            variant="primary"
            size="md"
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  // Initialize sync queue handling
  useSyncQueue();
  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <ToastProvider>
            <WalletSecurityProvider>
              <Web3Provider>
                <ModalProvider>
                  <NotificationsProvider>
                    <RootLayoutNav />
                  </NotificationsProvider>
                </ModalProvider>
              </Web3Provider>
            </WalletSecurityProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const { showToast } = useToast();
  const { setNetwork } = useWalletStore();
  const { colors, isDark } = useTheme();
  const [fontsLoaded, fontError] = useFonts();
  const [onboardingResolved, setOnboardingResolved] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void hideSplashScreen();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    let isMounted = true;

    const maybeShowOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem('hunty_onboarding_seen');
        if (!seen && isMounted) {
          router.replace('/onboarding');
        }
      } finally {
        if (isMounted) {
          setOnboardingResolved(true);
        }
      }
    };

    void maybeShowOnboarding();

    return () => {
      isMounted = false;
    };
  }, [fontsLoaded, fontError, router]);

  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return true;
    }

    return false;
  }, [router]);

  useBackHandler(handleBackPress);

  useEffect(() => {
    const routeFromUrl = (url: string) => {
      const { path, queryParams } = Linking.parse(url);

      const status = String(queryParams?.status ?? '').toLowerCase();
      const rawError = queryParams?.error ?? queryParams?.error_description ?? queryParams?.message;
      const callbackNetwork = String(queryParams?.network ?? queryParams?.chain ?? '').toLowerCase();

      if (callbackNetwork.includes('main')) {
        setNetwork('mainnet');
      } else if (callbackNetwork.includes('test')) {
        setNetwork('testnet');
      }

      if (status === 'error' || rawError) {
        const parsed = classifyWalletTxError(rawError);
        showToast({
          message: parsed.message,
          type: parsed.kind === 'unknown' ? 'error' : 'warning',
        });
      }

      if (path && path.length > 0) {
        const normalized = path.startsWith('/') ? path : `/${path}`;
        router.push(normalized as never);
        return;
      }

      router.push('/(tabs)' as never);
    };

    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          routeFromUrl(initialUrl);
        }
      })
      .catch(() => {
        // Ignore malformed callback URLs.
      });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      routeFromUrl(url);
    });

    return () => subscription.remove();
  }, [router, setNetwork, showToast]);

  if ((!fontsLoaded && !fontError) || !onboardingResolved) {
    // Render an opaque background instead of null to prevent white flash
    // while fonts load and onboarding state resolves.
    return <View style={[styles.safeArea, { backgroundColor: colors.background }]} />;
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <Stack
        screenOptions={{
          header: (props) => <StackHeader {...props} />,
          headerTintColor: '#ffffff',
          contentStyle: { backgroundColor: colors.background },
          statusBarStyle: isDark ? 'light' : 'dark',
          animation: 'none',
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="hunt/[id]" options={{ title: 'Hunt Details', animation: 'none' }} />
        <Stack.Screen name="network/switch" options={{ title: 'Switch Network', animation: 'none' }} />
        <Stack.Screen name="transaction/pending" options={{ title: 'Transaction Pending', animation: 'none' }} />
        <Stack.Screen name="details" options={{ title: 'Details', animation: 'none' }} />
        <Stack.Screen name="nested" options={{ title: 'Nested', animation: 'none' }} />
        <Stack.Screen name="settings/notifications" options={{ title: 'Notification Preferences', animation: 'none' }} />
      </Stack>
      <MemoryDiagnosticsOverlay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  errorTitle: { textAlign: 'center' },
  centered: { textAlign: 'center' },
});
