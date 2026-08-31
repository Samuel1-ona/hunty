function createWithNextIntl(loadPlugin = () => require('next-intl/plugin')) {
  const pluginPath = './i18n/request.ts';
  let withNextIntl = (config) => config;

  try {
    const plugin = loadPlugin();
    const createNextIntlPlugin = (plugin && (plugin.default ?? plugin)) || null;

    if (typeof createNextIntlPlugin === 'function') {
      withNextIntl = createNextIntlPlugin(pluginPath);
    }
  } catch {
    withNextIntl = (config) => config;
  }

  return withNextIntl;
}

module.exports = {
  createWithNextIntl,
};
