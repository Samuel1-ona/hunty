const path = require('path');

const alias = {
  '@': path.resolve(__dirname, '.'),
  '@lib': path.resolve(__dirname, '../lib'),
  '@store': path.resolve(__dirname, './store'),
  '@providers': path.resolve(__dirname, './providers'),
  '@hunty/types': path.resolve(__dirname, '../packages/types/src'),
};

module.exports = alias;
