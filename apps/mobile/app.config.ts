/// <reference types="node" />
import 'dotenv/config';

type AppEnv = 'development' | 'preview' | 'production';
const ENV = (process.env.APP_ENV ?? 'development') as AppEnv;

const envConfig = {
  development: {
    name: 'Hunty (Dev)',
    bundleId: 'io.hunty.mobile.dev',
    androidPackage: 'io.hunty.mobile.dev',
    icon: './assets/icon.png',
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT ?? 'https://dev-api.hunty.com',
  },
  preview: {
    name: 'Hunty (Preview)',
    bundleId: 'io.hunty.mobile.preview',
    androidPackage: 'io.hunty.mobile.preview',
    icon: './assets/icon.png',
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_PREVIEW ?? 'https://staging-api.hunty.com',
  },
  production: {
    name: 'Hunty',
    bundleId: 'io.hunty.mobile',
    androidPackage: 'io.hunty.mobile',
    icon: './assets/icon.png',
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION ?? 'https://api.hunty.com',
  },
};

const config = envConfig[ENV];

export default {
  expo: {
    name: config.name,
    slug: 'hunty',
    scheme: 'hunty',
    version: '1.0.0',
    orientation: 'portrait',
    icon: config.icon,
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1f2937',
    },
    ios: {
      bundleIdentifier: config.bundleId,
      supportsTablet: true,
      associatedDomains: ['applinks:hunty.app'],
      infoPlist: {
        UIBackgroundModes: ['location'],
        UIViewControllerBasedStatusBarAppearance: true,
        NSFaceIDUsageDescription: 'Use Face ID to unlock your Hunty wallet securely.',
        LSApplicationQueriesSchemes: [
          'wc',
          'rainbow',
          'metamask',
          'trust',
          'safe',
          'uniswap',
          'lobstr',
          'freighter',
        ],
      },
    },
    android: {
      package: config.androidPackage,
      permissions: [
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
      ],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1f2937',
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'hunty' }, { scheme: 'wc' }],
          category: ['DEFAULT', 'BROWSABLE'],
        },
        {
          action: 'VIEW',
          autoVerify: true,
          category: ['BROWSABLE', 'DEFAULT'],
          data: [
            {
              scheme: 'https',
              host: 'hunty.app',
              pathPrefix: '/hunt',
            },
          ],
        },
      ],
    },
    plugins: [
      'expo-router',
      'expo-notifications',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow Hunty to use your location to verify that you reached a proximity clue.',
          locationAlwaysAndWhenInUsePermission:
            'Allow Hunty to use your location while the app is closed so it can alert you when you reach an active clue. Hunty does not store your location history.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
    ],
    updates: {
      url: process.env.EXPO_UPDATE_URL ?? 'https://u.expo.dev/YOUR_EAS_PROJECT_ID',
      fallbackToCacheTimeout: 0,
      enabled: true,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    extra: {
      appEnv: ENV,
      apiUrl: config.apiUrl,
      walletConnectProjectId: process.env.WALLETCONNECT_PROJECT_ID ?? '',
      eas: {
        projectId: process.env.EAS_PROJECT_ID ?? 'YOUR_EAS_PROJECT_ID',
      },
    },
  },
};
