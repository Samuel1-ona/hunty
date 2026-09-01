module.exports = {
  default: {
    apiUrl: 'http://localhost:3000/api',
    graphqlUrl: 'http://localhost:4000/graphql',
    stellarRpcUrl: 'https://soroban-testnet.stellar.org',
    stellarNetwork: 'testnet',
    environment: 'development',
  },
};
// Support both default and named import styles
module.exports.default = module.exports.default || module.exports;
