import * as Location from 'expo-location';
import type { Clue } from '@lib/types';
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  getClueGeofenceRadiusMeters,
  getDistanceMeters,
  isLocationWithinGeofence,
} from '@lib/locationServices';

export type GeofenceCheckResult =
  | { allowed: true; distanceMeters: number; radiusMeters: number }
  | { allowed: false; reason: string; distanceMeters?: number; radiusMeters?: number };

type GeofencedClue = Clue & {
  latitude: number;
  longitude: number;
  geofenceRadiusMeters?: number;
};

export function hasClueGeofence(clue: Clue): clue is GeofencedClue {
  const candidate = clue as GeofencedClue;
  return (
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude)
  );
}

export async function verifyClueGeofence(clue: Clue): Promise<GeofenceCheckResult> {
  if (!hasClueGeofence(clue)) {
    return {
      allowed: false,
      reason: 'This clue is missing geofence coordinates, so the answer cannot be submitted yet.',
    };
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return {
      allowed: false,
      reason: 'Location permission is required before submitting this clue answer.',
    };
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    const radiusMeters = getClueGeofenceRadiusMeters(clue);

    const distanceMeters = getDistanceMeters(
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      {
        latitude: clue.latitude,
        longitude: clue.longitude,
      },
    );

    if (!isLocationWithinGeofence(distanceMeters, radiusMeters)) {
      return {
        allowed: false,
        distanceMeters,
        radiusMeters,
        reason: `You need to be within ${Math.round(radiusMeters)} m of this clue before submitting.`,
      };
    }

    return {
      allowed: true,
      distanceMeters,
      radiusMeters,
    };
  } catch {
    return {
      allowed: false,
      reason: 'Unable to confirm your GPS location. Check location services and try again.',
    };
  }
}

export { DEFAULT_GEOFENCE_RADIUS_METERS };
