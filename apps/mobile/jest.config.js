/** @type {import('jest').Config} */
module.exports = {
  // `react-native`'s preset (not jest-expo: expo-modules-core is not fully
  // installed) supplies the transform for react-native's Flow sources plus the
  // native-module mocks its entry point needs. Without it any test that imports
  // a component dies inside NativeReactNativeFeatureFlags before rendering.
  // Side effect to know about: the preset makes Jest resolve `.native.*`
  // files, which is why the AsyncStorage manual mock below exists.
  preset: 'react-native',
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/*.config.{js,ts}',
    '!coverage/**',
    '!**/.expo/**',
    '!path-alias.js',
  ],
  setupFiles: ['<rootDir>/__mocks__/jestSetup.js'],

  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      { configFile: require('path').resolve(__dirname, 'babel.config.js') },
    ],
  },

  // Transform expo/* and react-native/* sources, which ship ESM/Flow.
  // Under pnpm the real file lives at
  // node_modules/.pnpm/<pkg>@<version>/node_modules/<pkg>/..., so the pattern
  // must match that segment too; otherwise react-native's own setup file is
  // handed to Node untransformed and every component test dies with
  // "Cannot use import statement outside a module".
  transformIgnorePatterns: [
    'node_modules/(?!(\.pnpm/[^/]+/node_modules/)?(expo|@expo|expo-[^/]+|react-native|@react-native)(@|/))',
  ],

  // Manual mocks for native/expo modules
  moduleNameMapper: {
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

  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
};
