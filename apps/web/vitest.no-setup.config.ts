import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

// Minimal config for pure-logic tests (#1194): no jsdom setup file, so the
// pre-existing react/react-dom version mismatch in the repo does not block
// tests that do not touch React.

export default defineConfig({
  plugins: [react()],
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
