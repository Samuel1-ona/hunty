module.exports = {
  digestStringAsync: jest.fn().mockResolvedValue('HASH'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
};
