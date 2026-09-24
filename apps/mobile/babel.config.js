module.exports = function (api) {
  const isTest = api.env('test');
  api.cache.using(() => isTest);
  return {
    presets: ['babel-preset-expo'],
    plugins: isTest
      ? []
      : [
          [
            'module-resolver',
            {
              root: ['.'],
              alias: {
                '@': './',
                '@lib': './lib',
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
          'nativewind/babel',
          'react-native-reanimated/plugin',
        ],
  };
};
