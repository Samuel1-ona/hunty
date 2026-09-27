/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
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
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: require.resolve('./babel.config.js') }],
  },

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
