import type { Clue } from '@hunty/types';
import * as Location from 'expo-location';
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  getClueGeofenceRadiusMeters,
  getDistanceMeters,
  isLocationWithinGeofence,
  // eslint-disable-next-line import/no-unresolved -- resolved via jest moduleNameMapper
} from '@lib/locationServices';
import { hasClueGeofence, verifyClueGeofence } from '../lib/locationGate';

jest.mock('expo-location');
jest.mock('@lib/locationServices');

function makeClue(overrides: Partial<Clue> = {}): Clue {
  return {
    id: 1,
    huntId: 1,
    question: 'Q',
    answer: 'A',
    points: 10,
    ...overrides,
  };
}

describe('hasClueGeofence', () => {
  it('returns true when latitude and longitude are finite numbers', () => {
    expect(hasClueGeofence(makeClue({ latitude: 40.0, longitude: -74.0 }))).toBe(true);
  });

  it('returns false when latitude is missing', () => {
    expect(hasClueGeofence(makeClue({ longitude: -74.0 }))).toBe(false);
  });

  it('returns false when longitude is missing', () => {
    expect(hasClueGeofence(makeClue({ latitude: 40.0 }))).toBe(false);
  });

  it('returns false when latitude is NaN', () => {
    expect(hasClueGeofence(makeClue({ latitude: NaN, longitude: -74.0 }))).toBe(false);
  });

  it('returns false when longitude is Infinity', () => {
    expect(hasClueGeofence(makeClue({ latitude: 40.0, longitude: Infinity }))).toBe(false);
  });

  it('returns false when both coordinates are absent', () => {
    expect(hasClueGeofence(makeClue())).toBe(false);
  });
});

describe('verifyClueGeofence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns not-allowed when clue has no geofence coordinates', async () => {
    const result = await verifyClueGeofence(makeClue());
    expect(result.allowed).toBe(false);
    expect(result).toHaveProperty('reason', expect.stringContaining('missing geofence'));
  });

  it('returns not-allowed when location permission is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const result = await verifyClueGeofence(makeClue({ latitude: 40.0, longitude: -74.0 }));
    expect(result.allowed).toBe(false);
    expect(result).toHaveProperty('reason', expect.stringContaining('Location permission'));
  });

  it('returns allowed when within the geofence', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 40.001, longitude: -74.001 },
    });
    (getClueGeofenceRadiusMeters as jest.Mock).mockReturnValue(100);
    (getDistanceMeters as jest.Mock).mockReturnValue(50);
    (isLocationWithinGeofence as jest.Mock).mockReturnValue(true);

    const result = await verifyClueGeofence(
      makeClue({ latitude: 40.0, longitude: -74.0, geofenceRadiusMeters: 100 }),
    );
    expect(result.allowed).toBe(true);
    expect(result).toHaveProperty('distanceMeters', 50);
    expect(result).toHaveProperty('radiusMeters', 100);
  });

  it('returns not-allowed with distance info when outside the geofence', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 40.01, longitude: -74.01 },
    });
    (getClueGeofenceRadiusMeters as jest.Mock).mockReturnValue(100);
    (getDistanceMeters as jest.Mock).mockReturnValue(1500);
    (isLocationWithinGeofence as jest.Mock).mockReturnValue(false);

    const result = await verifyClueGeofence(makeClue({ latitude: 40.0, longitude: -74.0 }));
    expect(result.allowed).toBe(false);
    expect(result).toHaveProperty('distanceMeters', 1500);
    expect(result).toHaveProperty('radiusMeters', 100);
    expect(result).toHaveProperty('reason', expect.stringContaining('100 m'));
  });

  it('returns not-allowed when GPS position fetch throws', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('GPS unavailable'));

    const result = await verifyClueGeofence(makeClue({ latitude: 40.0, longitude: -74.0 }));
    expect(result.allowed).toBe(false);
    expect(result).toHaveProperty('reason', expect.stringContaining('GPS'));
  });
});

describe('DEFAULT_GEOFENCE_RADIUS_METERS', () => {
  it('re-exports the shared constant', () => {
    expect(DEFAULT_GEOFENCE_RADIUS_METERS).toBe(100);
  });
});
