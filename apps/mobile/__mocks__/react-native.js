module.exports = {
  Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
  NativeModules: {},
  StyleSheet: { create: (styles) => styles },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
};
