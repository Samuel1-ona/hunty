import type { Clue } from './types';

export const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type GeofenceCandidate = Pick<Clue, 'geofenceRadiusMeters'> & Coordinates;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function getDistanceMeters(from: Coordinates, to: Coordinates): number {
  const earthRadiusMeters = 6_371_000;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getClueGeofenceRadiusMeters(clue: GeofenceCandidate | null | undefined): number {
  if (typeof clue?.geofenceRadiusMeters === 'number' && clue.geofenceRadiusMeters > 0) {
    return clue.geofenceRadiusMeters;
  }

  return DEFAULT_GEOFENCE_RADIUS_METERS;
}

export function isLocationWithinGeofence(distanceMeters: number, radiusMeters: number): boolean {
  return distanceMeters <= radiusMeters;
}
