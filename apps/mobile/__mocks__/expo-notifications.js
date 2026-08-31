/**
 * Manual mock for expo-notifications in the Jest environment.
 */
module.exports = {
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  setNotificationChannelAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(() => Promise.resolve(true)),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  registerTaskAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { HIGH: 'HIGH', DEFAULT: 'DEFAULT', LOW: 'LOW' },
};
