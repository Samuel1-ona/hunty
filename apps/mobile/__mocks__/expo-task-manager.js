/**
 * Manual mock for expo-task-manager in the Jest environment.
 */
module.exports = {
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
};
