/** Minimal Babel config used only during Jest runs. */
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@': './',
          // No '@lib' alias: mobile's @lib/* imports live in apps/web/lib and
          // are resolved by jest.config.js moduleNameMapper instead.
          '@store': './store',
          '@providers': './providers',
          '@components': './components',
          '@utils': './utils',
          '@config': './config',
          '@services': './services',
          '@hooks': './hooks',
          '@app': './app',
          '@hunty/types': '../../packages/types/src',
          '@hunty/ui': '../../packages/ui/src',
          '@hunty/ui/toast': '../../packages/ui/src/toast',
        },
      },
    ],
  ],
};
