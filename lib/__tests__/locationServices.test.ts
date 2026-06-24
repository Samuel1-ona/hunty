import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  getClueGeofenceRadiusMeters,
  getDistanceMeters,
  isLocationWithinGeofence,
} from '@/lib/locationServices';

describe('locationServices', () => {
  it('returns a zero distance for identical coordinates', () => {
    expect(getDistanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0);
  });

  it('flags a position inside the geofence radius', () => {
    const distanceMeters = getDistanceMeters(
      { latitude: 40.7484, longitude: -73.9857 },
      { latitude: 40.74845, longitude: -73.98575 },
    );

    expect(distanceMeters).toBeGreaterThan(0);
    expect(isLocationWithinGeofence(distanceMeters, 100)).toBe(true);
  });

  it('uses the clue radius when provided and falls back to the default otherwise', () => {
    expect(getClueGeofenceRadiusMeters({ geofenceRadiusMeters: 250 } as any)).toBe(250);
    expect(getClueGeofenceRadiusMeters({} as any)).toBe(DEFAULT_GEOFENCE_RADIUS_METERS);
  });
});
