/** @type {import('jest').Config} */
module.exports = {
  // Don't use jest-expo preset — expo-modules-core is not fully installed.
  // We configure transforms manually below.
  testEnvironment: 'node',

  setupFiles: ['<rootDir>/__mocks__/jestSetup.js'],

  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      { configFile: require('path').resolve(__dirname, 'babel.config.js') },
    ],
  },

  // Transform expo/* packages since they ship ESM
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.pnpm|expo.*|@expo.*|react-native.*|@react-native.*|@testing-library.*))',
  ],

  moduleNameMapper: {
    '^@sentry/react-native$': '<rootDir>/__mocks__/@sentry/react-native.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    '^expo-crypto$': '<rootDir>/__mocks__/expo-crypto.js',
    '^expo-local-authentication$': '<rootDir>/__mocks__/expo-local-authentication.js',
    '^expo-random$': '<rootDir>/__mocks__/expo-random.js',
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.js',
    '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.js',
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.js',
    '^expo-device$': '<rootDir>/__mocks__/expo-device.js',
    '^expo-modules-core$': '<rootDir>/__mocks__/expo-modules-core.js',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@store/(.*)$': '<rootDir>/store/$1',
    '^@providers/(.*)$': '<rootDir>/providers/$1',
    '^@lib/(.*)$': '<rootDir>/../web/lib/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@/(.*)$': '<rootDir>/$1',
    // Mock assets
    '\\.(png|jpg|jpeg|gif|svg|ico|webp|ttf|otf)$': '<rootDir>/__mocks__/fileMock.js',
  },

  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
};
