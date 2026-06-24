import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeAnalytics,
  trackEvent,
  trackScreenView,
  trackUserAction,
  trackAppStart,
  trackScreenLoad,
  reportError,
  setUserContext,
  getOptOutStatus,
  optIn,
  optOut,
  onNavigationStateChange,
} from '@services/analytics';

// ───────────────────────────────────────────────────────────
// Mocks
// ───────────────────────────────────────────────────────────

vi.mock('@sentry/react-native', () => ({
  init: vi.fn(),
  close: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setTags: vi.fn(),
  configureScope: vi.fn((cb) => cb({ setTag: vi.fn() })),
  startTransaction: vi.fn(() => ({
    setData: vi.fn(),
    finish: vi.fn(),
  })),
  withScope: vi.fn((cb) => cb({ setExtra: vi.fn() })),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: { version: '1.0.0', ios: { buildNumber: '1' } },
    platform: { ios: {} },
    nativeBuildVersion: '1.0.0',
  },
}));

// ───────────────────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────────────────

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeAnalytics', () => {
    it('initializes Sentry when DSN is provided and not opted out', async () => {
      (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue('false');

      await initializeAnalytics({ sentryDsn: 'https://test@sentry.io/1' });

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/1',
          environment: 'development',
        })
      );
    });

    it('does not initialize Sentry when opted out', async () => {
      (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue('true');

      await initializeAnalytics({ sentryDsn: 'https://test@sentry.io/1' });

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('does not initialize Sentry when DSN is missing', async () => {
      (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue('false');

      await initializeAnalytics({ sentryDsn: '' });

      expect(Sentry.init).not.toHaveBeenCalled();
    });
  });

  describe('opt-out / opt-in', () => {
    it('optOut persists status and closes Sentry', async () => {
      await optOut();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@hunty/analytics_opt_out', 'true');
      expect(Sentry.close).toHaveBeenCalled();
    });

    it('optIn persists status and re-initializes', async () => {
      (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue('true');

      await optIn();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@hunty/analytics_opt_out', 'false');
    });

    it('getOptOutStatus returns true when stored', async () => {
      (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue('true');

      const result = await getOptOutStatus();
      expect(result).toBe(true);
    });

    it('getOptOutStatus returns false when not stored', async () => {
      (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getOptOutStatus();
      expect(result).toBe(false);
    });
  });

  describe('trackEvent', () => {
    it('sends breadcrumb and message to Sentry', () => {
      trackEvent({ name: 'hunt_started', params: { hunt_id: '123' } });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'analytics',
          message: 'hunt_started',
        })
      );
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'analytics:hunt_started',
        expect.objectContaining({
          level: 'info',
          tags: expect.objectContaining({ event_name: 'hunt_started' }),
        })
      );
    });
  });

  describe('trackScreenView', () => {
    it('tracks screen view and sets scope tag', () => {
      trackScreenView('HuntDetail', 'Home');

      expect(Sentry.addBreadcrumb).toHaveBeenCalled();
      expect(Sentry.configureScope).toHaveBeenCalled();
    });
  });

  describe('trackUserAction', () => {
    it('tracks action with target and value', () => {
      trackUserAction('tap', 'claim_button', true);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'analytics:user_action',
        expect.any(Object)
      );
    });
  });

  describe('trackAppStart', () => {
    it('tracks event and starts Sentry transaction', () => {
      trackAppStart(1200, true);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'analytics:app_start',
        expect.any(Object)
      );
      expect(Sentry.startTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'app_start', op: 'app.lifecycle' })
      );
    });
  });

  describe('trackScreenLoad', () => {
    it('tracks event and starts Sentry transaction', () => {
      trackScreenLoad('HuntDetail', 450);

      expect(Sentry.startTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'screen_load:HuntDetail', op: 'ui.load' })
      );
    });
  });

  describe('reportError', () => {
    it('captures exception with context', () => {
      const error = new Error('Test error');
      reportError(error, { huntId: '123' });

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });

  describe('setUserContext', () => {
    it('sets wallet address as user id', () => {
      setUserContext('GABC123...');

      expect(Sentry.setUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'GABC123...', wallet_address: 'GABC123...' })
      );
    });

    it('clears user when null passed', () => {
      setUserContext(null);

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('onNavigationStateChange', () => {
    it('tracks screen view on route change', () => {
      onNavigationStateChange('HuntDetail');

      expect(Sentry.addBreadcrumb).toHaveBeenCalled();
    });

    it('does not track duplicate consecutive screens', () => {
      onNavigationStateChange('HuntDetail');
      onNavigationStateChange('HuntDetail');

      const calls = (Sentry.addBreadcrumb as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.filter((c) => c[0]?.message === 'screen_view').length).toBe(1);
    });
  });
});