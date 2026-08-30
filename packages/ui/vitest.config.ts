import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/__mocks__/**',
        'src/**/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@hunty/types': path.resolve(__dirname, '../types/src/index.ts'),
      'react-native': path.resolve(__dirname, './src/__mocks__/react-native.ts'),
    },
  },
});
