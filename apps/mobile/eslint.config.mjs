import { FlatCompat } from '@eslint/eslintrc';
import { duplicateBindingRules } from '@hunty/config/eslint/base.mjs';
import reactNativeConfig from '@hunty/config/eslint/react-native.mjs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...reactNativeConfig,
  ...compat.extends('expo', 'prettier'),
  {
    ignores: ['node_modules/', '.expo/', 'build/', 'dist/', 'coverage/'],
  },
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // eslint-config-expo turns the base `no-redeclare` off in favour of the
  // TypeScript-aware variant at "warn", so re-assert both rules last to keep
  // duplicate imports and redeclared bindings at error severity here.
  {
    rules: {
      ...duplicateBindingRules,
    },
  },
];

export default eslintConfig;
