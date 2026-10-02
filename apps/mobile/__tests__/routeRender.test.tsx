import React from 'react';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react-native';

const appDirectory = path.resolve(__dirname, '../app');

function findRoutes(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return entry.name === 'hooks' ? [] : findRoutes(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.tsx') && entry.name !== '_layout.tsx'
      ? [entryPath]
      : [];
  });
}

const routes = findRoutes(appDirectory).sort();

jest.mock('react-native', () => {
  const ReactRuntime = require('react');
  const nativeNames = [
    'ActivityIndicator',
    'Button',
    'FlatList',
    'Image',
    'Modal',
    'Pressable',
    'RefreshControl',
    'SafeAreaView',
    'ScrollView',
    'SectionList',
    'Switch',
    'Text',
    'TextInput',
    'TouchableOpacity',
    'View',
  ];
  const nativeComponents = Object.fromEntries(
    nativeNames.map((name) => [
      name,
      ReactRuntime.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) =>
        ReactRuntime.createElement(name, { ...props, ref }, props.children as React.ReactNode),
      ),
    ]),
  );

  return {
    ...nativeComponents,
    Alert: { alert: jest.fn() },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    Linking: { openURL: jest.fn() },
    NativeModules: {},
    PixelRatio: { getFontScale: () => 1, roundToNearestPixel: (value: number) => value },
    Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios },
    StyleSheet: {
      absoluteFillObject: {},
      create: (styles: object) => styles,
      flatten: (styles: unknown) => styles,
      hairlineWidth: 1,
    },
    useColorScheme: () => 'light',
    useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
  };
});

jest.mock('@providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      border: '#dddddd',
      primary: '#176b5b',
      secondary: '#666666',
      success: '#16803c',
      text: '#111111',
      warning: '#b45309',
    },
    isDark: false,
    themePreference: 'system',
    setThemePreference: jest.fn(),
  }),
}));

jest.mock('@providers/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@providers/ReactQueryProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@hooks/useHaptics', () => ({
  useHaptics: () => ({ triggerImpact: jest.fn(), triggerNotification: jest.fn() }),
}));

jest.mock('@hooks/useRefreshByUser', () => ({
  useRefreshByUser: () => ({ isRefreshing: false, onRefresh: jest.fn() }),
}));

jest.mock('@hooks/useNotifications', () => ({
  useNotifications: () => ({
    enabled: false,
    loading: false,
    permissionStatus: 'undetermined',
    toggle: jest.fn(),
    unregister: jest.fn(),
  }),
}));

jest.mock('@app/hooks/usePlayerLocation', () => ({
  usePlayerLocation: () => ({
    location: null,
    error: null,
    loading: false,
    permissionGranted: false,
    shareLocation: false,
    setShareLocation: jest.fn(),
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'dashboard' ? { balance: 0 } : queryKey[0] === 'hunt' ? null : [],
    isError: false,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@store/useStore', () => ({
  usePlayerStore: () => ({
    currentProgress: null,
    getCompletedClues: () => new Set(),
    markCompleted: jest.fn(),
    markClueCompleted: jest.fn(),
    updateClueIndex: jest.fn(),
    clearProgress: jest.fn(),
  }),
  useWalletStore: () => ({ network: 'testnet' }),
}));

jest.mock('@store/huntStore', () => ({
  getAllHunts: jest.fn().mockResolvedValue([]),
  getHuntById: jest.fn().mockResolvedValue(null),
  getHuntClues: jest.fn().mockResolvedValue([]),
}));

jest.mock('@providers/WalletSecurityProvider', () => ({
  WalletSecurityProvider: ({ children }: { children: React.ReactNode }) => children,
  useWalletSecurity: () => ({
    initialized: true,
    biometricAvailable: false,
    biometricType: null,
    biometricEnabled: false,
    pinSet: false,
    authError: null,
    enableBiometrics: jest.fn(),
    disableBiometrics: jest.fn(),
    setPin: jest.fn(),
    updatePin: jest.fn(),
    removePin: jest.fn(),
    lock: jest.fn(),
  }),
}));

jest.mock('expo-router', () => {
  const { View } = require('react-native');
  const Navigator = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  Navigator.Screen = () => null;

  return {
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: Navigator,
    Tabs: Navigator,
    useLocalSearchParams: () => ({}),
    useRouter: () => ({
      back: jest.fn(),
      canGoBack: () => false,
      push: jest.fn(),
      replace: jest.fn(),
    }),
  };
});

jest.mock('expo-application', () => ({
  getIosIdForVendorAsync: jest.fn().mockResolvedValue('mock-vendor-id'),
}));
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});
jest.mock('expo-camera', () => {
  const { View } = require('react-native');
  return {
    BarCodeScanner: {},
    Camera: { requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }) },
    CameraType: { back: 'back' },
    CameraView: View,
    FlashMode: { off: 'off', torch: 'torch' },
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'View' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Text' }));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    Easing: { linear: jest.fn() },
    useAnimatedStyle: (style: () => object) => style(),
    useSharedValue: (value: unknown) => ({ value }),
    withRepeat: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaProvider: View,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: () => jest.fn() },
}));

describe('mobile route rendering', () => {
  it.each(routes)('%s renders without throwing', (routePath) => {
    const Route = require(routePath).default;

    expect(typeof Route).toBe('function');
    expect(() => render(React.createElement(Route))).not.toThrow();
  });
});
