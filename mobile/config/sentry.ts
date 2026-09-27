import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || (__DEV__ ? 'development' : 'production');

let initialized = false;

export const initializeSentry = () => {
  if (initialized) return;

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment,
    debug: __DEV__,
  });

  initialized = true;
};

export { Sentry };
