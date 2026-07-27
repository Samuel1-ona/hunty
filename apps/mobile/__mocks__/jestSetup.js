// Define React Native globals for the Jest environment
global.__DEV__ = true;

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('react-test-renderer is deprecated')) {
    return;
  }
  originalError(...args);
};
