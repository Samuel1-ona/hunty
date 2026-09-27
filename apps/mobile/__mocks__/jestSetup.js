// Define React Native globals for the Jest environment
global.__DEV__ = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
