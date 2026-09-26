/** @type {import('jest').Config} */
module.exports = {
  // Don't use jest-expo preset — expo-modules-core is not fully installed.
  // We configure transforms manually below.
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

  // Transform expo/* packages since they ship ESM.
  //
  // `\.pnpm` must be in the allowlist: pnpm stores packages as
  // node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/..., so without it the
  // pattern matches at the first `node_modules/` and expo's ESM files
  // (expo/virtual/env.js) are skipped by the transformer, which makes every
  // suite that reaches them fail to parse with "Unexpected token 'export'".
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|expo|@expo|expo-notifications|expo-device|expo-constants|expo-secure-store|expo-modules-core|react-native|@react-native)/)',
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
