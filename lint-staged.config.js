const path = require('path');

module.exports = {
  // For mobile files
  'mobile/**/*.{js,jsx,ts,tsx}': (files) => {
    const mobileDir = path.resolve(__dirname, 'mobile');
    const relativeFiles = files.map((file) => path.relative(mobileDir, path.resolve(file)));
    return `pnpm --filter mobile exec eslint --fix ${relativeFiles.join(' ')}`;
  },

  // For root files
  '!(mobile)/**/*.{js,jsx,ts,tsx}': (files) => {
    return `pnpm exec eslint --fix ${files.join(' ')}`;
  },
};
