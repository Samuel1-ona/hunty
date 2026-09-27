type AppEnv = 'development' | 'preview' | 'production';

const APP_ENV = (process.env.APP_ENV ?? (__DEV__ ? 'development' : 'production')) as AppEnv;

const ENV: Record<
  AppEnv,
  { apiUrl: string; graphqlUrl: string; stellarRpcUrl: string; stellarNetwork: string }
> = {
  development: {
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT ?? 'http://localhost:3000/api',
    graphqlUrl: process.env.EXPO_PUBLIC_GRAPHQL_URL_DEVELOPMENT ?? 'http://localhost:4000/graphql',
    stellarRpcUrl: process.env.EXPO_PUBLIC_STELLAR_RPC_URL_DEVELOPMENT ?? 'https://soroban-testnet.stellar.org',
    stellarNetwork: process.env.EXPO_PUBLIC_STELLAR_NETWORK_DEVELOPMENT ?? 'testnet',
  },
  preview: {
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_PREVIEW ?? 'https://staging-api.hunty.app',
    graphqlUrl: process.env.EXPO_PUBLIC_GRAPHQL_URL_PREVIEW ?? 'https://staging-indexer.hunty.app/graphql',
    stellarRpcUrl: process.env.EXPO_PUBLIC_STELLAR_RPC_URL_PREVIEW ?? 'https://soroban-testnet.stellar.org',
    stellarNetwork: process.env.EXPO_PUBLIC_STELLAR_NETWORK_PREVIEW ?? 'testnet',
  },
  production: {
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION ?? 'https://api.hunty.app',
    graphqlUrl: process.env.EXPO_PUBLIC_GRAPHQL_URL_PRODUCTION ?? 'https://indexer.hunty.app/graphql',
    stellarRpcUrl: process.env.EXPO_PUBLIC_STELLAR_RPC_URL_PRODUCTION ?? 'https://soroban-mainnet.stellar.org',
    stellarNetwork: process.env.EXPO_PUBLIC_STELLAR_NETWORK_PRODUCTION ?? 'mainnet',
  },
};

const env = {
  ...ENV[APP_ENV],
  environment: APP_ENV,
};

export default env;
