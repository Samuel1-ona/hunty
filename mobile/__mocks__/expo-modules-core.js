module.exports = {
  NativeModulesProxy: {},
  EventEmitter: class EventEmitter {
    addListener() { return { remove: jest.fn() }; }
    removeAllListeners() {}
    emit() {}
  },
  requireNativeModule: jest.fn(() => ({})),
  requireOptionalNativeModule: jest.fn(() => null),
  Platform: { OS: 'ios' },
};
