type AppEnv = 'development' | 'preview' | 'production';

const APP_ENV = (process.env.APP_ENV ?? (__DEV__ ? 'development' : 'production')) as AppEnv;

const ENV: Record<
  AppEnv,
  {
    apiUrl: string;
    graphqlUrl: string;
    stellarRpcUrl: string;
    stellarNetwork: string;
    /** Deployed Hunty Soroban contract (C...). Empty disables on-chain actions. */
    huntyContractId: string;
  }
> = {
  development: {
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT ?? 'http://localhost:3000/api',
    graphqlUrl: process.env.EXPO_PUBLIC_GRAPHQL_URL_DEVELOPMENT ?? 'http://localhost:4000/graphql',
    stellarRpcUrl:
      process.env.EXPO_PUBLIC_STELLAR_RPC_URL_DEVELOPMENT ?? 'https://soroban-testnet.stellar.org',
    stellarNetwork: process.env.EXPO_PUBLIC_STELLAR_NETWORK_DEVELOPMENT ?? 'testnet',
    huntyContractId: process.env.EXPO_PUBLIC_HUNTY_CONTRACT_ID_DEVELOPMENT ?? '',
  },
  preview: {
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_PREVIEW ?? 'https://staging-api.hunty.app',
    graphqlUrl:
      process.env.EXPO_PUBLIC_GRAPHQL_URL_PREVIEW ?? 'https://staging-indexer.hunty.app/graphql',
    stellarRpcUrl:
      process.env.EXPO_PUBLIC_STELLAR_RPC_URL_PREVIEW ?? 'https://soroban-testnet.stellar.org',
    stellarNetwork: process.env.EXPO_PUBLIC_STELLAR_NETWORK_PREVIEW ?? 'testnet',
    huntyContractId: process.env.EXPO_PUBLIC_HUNTY_CONTRACT_ID_PREVIEW ?? '',
  },
  production: {
    apiUrl: process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION ?? 'https://api.hunty.app',
    graphqlUrl:
      process.env.EXPO_PUBLIC_GRAPHQL_URL_PRODUCTION ?? 'https://indexer.hunty.app/graphql',
    stellarRpcUrl:
      process.env.EXPO_PUBLIC_STELLAR_RPC_URL_PRODUCTION ?? 'https://soroban-mainnet.stellar.org',
    stellarNetwork: process.env.EXPO_PUBLIC_STELLAR_NETWORK_PRODUCTION ?? 'mainnet',
    huntyContractId: process.env.EXPO_PUBLIC_HUNTY_CONTRACT_ID_PRODUCTION ?? '',
  },
};

const NETWORK_PASSPHRASES: Record<string, string> = {
  testnet: 'Test SDF Network ; September 2015',
  mainnet: 'Public Global Stellar Network ; September 2015',
};

const selected = ENV[APP_ENV];

const env = {
  ...selected,
  stellarNetworkPassphrase:
    NETWORK_PASSPHRASES[selected.stellarNetwork] ?? NETWORK_PASSPHRASES.testnet,
  environment: APP_ENV,
};

export default env;
