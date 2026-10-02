export const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

import type { Clue } from '@hunty/types';

export function getClueGeofenceRadiusMeters(clue: Clue): number {
  return clue.geofenceRadiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

export function getDistanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return R * c;
}

export function isLocationWithinGeofence(distanceMeters: number, radiusMeters: number): boolean {
  return distanceMeters <= radiusMeters;
}
