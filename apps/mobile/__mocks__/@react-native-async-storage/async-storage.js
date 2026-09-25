// Manual mock for @react-native-async-storage/async-storage.
//
// With the react-native Jest preset, Jest resolves the package's
// `AsyncStorage.native.ts`, which throws "[@RNC/AsyncStorage]: NativeModule:
// AsyncStorage is null" outside a real app. The package ships an official jest
// mock for exactly this; re-exporting it here applies to every suite without
// editing the suites themselves.
module.exports = require('@react-native-async-storage/async-storage/jest/async-storage-mock');
