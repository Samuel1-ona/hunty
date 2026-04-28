import expoConfig from 'eslint-config-expo/flat.js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

const expoFlatConfig = Array.isArray(expoConfig) ? expoConfig : [expoConfig];
const prettierFlatConfig = Array.isArray(eslintPluginPrettierRecommended)
  ? eslintPluginPrettierRecommended
  : [eslintPluginPrettierRecommended];

export default [
  ...expoFlatConfig,
  ...prettierFlatConfig,
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      'ios/*',
      'android/*',
      '.expo/*',
      'expo-env.d.ts',
    ],
  },
];
