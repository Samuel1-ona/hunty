import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('expo', 'prettier'),
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'build/',
      'dist/',
      'coverage/',
      'babel.config.js',
      'metro.config.js',
      'jest.config.js',
      'tailwind.config.js',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    settings: {
      'import/resolver': {
        typescript: { project: `${__dirname}/tsconfig.json` },
      },
    },
    rules: {
      'no-console': 'off',
      'react-hooks/exhaustive-deps': 'off',
      // TypeScript handles these natively; ESLint checking them causes false positives
      'import/no-unresolved': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-redeclare': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];

export default eslintConfig;
