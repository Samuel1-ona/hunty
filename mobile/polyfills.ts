import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import 'react-native-url-polyfill/auto';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

if (typeof global.TextEncoder === 'undefined') {
  const encoding = require('text-encoding');
  global.TextEncoder = encoding.TextEncoder;
  global.TextDecoder = encoding.TextDecoder;
}
