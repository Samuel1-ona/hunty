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
          '@lib': '../lib',
          '@store': './store',
          '@providers': './providers',
          '@components': './components',
          '@utils': './utils',
          '@config': './config',
          '@services': './services',
          '@hooks': './hooks',
          '@app': './app',
        },
      },
    ],
  ],
};
