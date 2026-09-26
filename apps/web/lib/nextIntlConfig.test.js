const test = require('node:test');
const assert = require('node:assert/strict');

const { createWithNextIntl } = require('./nextIntlConfig.js');

test('falls back to an identity wrapper when next-intl/plugin cannot be loaded', () => {
  const withNextIntl = createWithNextIntl(() => {
    throw new Error('missing module');
  });

  const config = { reactStrictMode: true };
  assert.equal(withNextIntl(config), config);
});

test('uses the next-intl plugin when it is available', () => {
  const plugin = (path) => (config) => ({ ...config, pluginPath: path });
  const withNextIntl = createWithNextIntl(() => ({ default: plugin }));

  const config = { reactStrictMode: true };
  const wrapped = withNextIntl(config);

  assert.equal(wrapped.pluginPath, './i18n/request.ts');
  assert.equal(wrapped.reactStrictMode, true);
});
