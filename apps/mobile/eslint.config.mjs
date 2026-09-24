import { FlatCompat } from '@eslint/eslintrc';
import reactNativeConfig from '@hunty/config/eslint/react-native.mjs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
  },
  ...reactNativeConfig,
  ...compat.extends('expo', 'prettier'),
  {
    ignores: ['node_modules/', '.expo/', 'build/', 'dist/', 'coverage/'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

export default eslintConfig;
