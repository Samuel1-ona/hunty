import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Clue } from '@hunty/types';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { DEFAULT_GEOFENCE_RADIUS_METERS } from '@/lib/locationGate';

export const BACKGROUND_PROXIMITY_TASK = 'hunty-background-proximity';
export const BACKGROUND_LOCATION_RATIONALE =
  'Hunty uses your location while the app is closed to alert you when you reach an active clue. It monitors only the active hunt, stores no location history, and stops when the hunt ends or you turn it off.';

const METRICS_KEY = 'hunty-background-location-metrics';
const NOTIFIED_KEY = 'hunty-background-location-notified';
const MAX_REGIONS = 20;

export type BackgroundLocationMetrics = {
  startedAt: string | null;
  stoppedAt: string | null;
  backgroundEvents: number;
  entryEvents: number;
  lastEventAt: string | null;
};

const EMPTY_METRICS: BackgroundLocationMetrics = {
  startedAt: null,
  stoppedAt: null,
  backgroundEvents: 0,
  entryEvents: 0,
  lastEventAt: null,
};

async function readMetrics(): Promise<BackgroundLocationMetrics> {
  const stored = await AsyncStorage.getItem(METRICS_KEY);
  if (!stored) return EMPTY_METRICS;

  try {
    return { ...EMPTY_METRICS, ...(JSON.parse(stored) as BackgroundLocationMetrics) };
  } catch {
    return EMPTY_METRICS;
  }
}

async function recordEvent(isEntry: boolean): Promise<void> {
  const metrics = await readMetrics();
  await AsyncStorage.setItem(
    METRICS_KEY,
    JSON.stringify({
      ...metrics,
      backgroundEvents: metrics.backgroundEvents + 1,
      entryEvents: metrics.entryEvents + (isEntry ? 1 : 0),
      lastEventAt: new Date().toISOString(),
    }),
  );
}

TaskManager.defineTask(BACKGROUND_PROXIMITY_TASK, async ({ data, error }) => {
  if (error || !data) return;

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };
  const isEntry = eventType === Location.GeofencingEventType.Enter;
  await recordEvent(isEntry);
  if (!isEntry) return;

  const identifier = region.identifier;
  if (!identifier) return;

  const notified = new Set<string>(JSON.parse((await AsyncStorage.getItem(NOTIFIED_KEY)) ?? '[]'));
  if (notified.has(identifier)) return;

  notified.add(identifier);
  await AsyncStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified]));
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'You reached a clue',
      body: 'Open Hunty to view and solve the nearby clue.',
      data: { type: 'proximity-clue', clueIdentifier: identifier },
    },
    trigger: null,
  });
});

export function buildClueRegions(huntId: number, clues: Clue[]): Location.LocationRegion[] {
  return clues
    .filter(
      (clue) =>
        Number.isFinite(clue.latitude) &&
        Number.isFinite(clue.longitude) &&
        clue.latitude! >= -90 &&
        clue.latitude! <= 90 &&
        clue.longitude! >= -180 &&
        clue.longitude! <= 180,
    )
    .slice(0, MAX_REGIONS)
    .map((clue) => ({
      identifier: `${huntId}:${clue.id}`,
      latitude: clue.latitude!,
      longitude: clue.longitude!,
      radius: Math.max(1, clue.geofenceRadiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS),
      notifyOnEnter: true,
      notifyOnExit: false,
    }));
}

export async function enableBackgroundProximity(
  huntId: number,
  clues: Clue[],
): Promise<{ enabled: true; regionCount: number } | { enabled: false; reason: string }> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    return { enabled: false, reason: 'Foreground location permission was not granted.' };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    return { enabled: false, reason: 'Background location permission was not granted.' };
  }

  const regions = buildClueRegions(huntId, clues);
  if (regions.length === 0) {
    return { enabled: false, reason: 'This hunt has no proximity clues to monitor.' };
  }

  await AsyncStorage.removeItem(NOTIFIED_KEY);
  await Location.startGeofencingAsync(BACKGROUND_PROXIMITY_TASK, regions);
  const metrics = await readMetrics();
  await AsyncStorage.setItem(
    METRICS_KEY,
    JSON.stringify({ ...metrics, startedAt: new Date().toISOString(), stoppedAt: null }),
  );
  return { enabled: true, regionCount: regions.length };
}

export async function disableBackgroundProximity(): Promise<void> {
  if (await Location.hasStartedGeofencingAsync(BACKGROUND_PROXIMITY_TASK)) {
    await Location.stopGeofencingAsync(BACKGROUND_PROXIMITY_TASK);
  }
  const metrics = await readMetrics();
  await AsyncStorage.setItem(
    METRICS_KEY,
    JSON.stringify({ ...metrics, stoppedAt: new Date().toISOString() }),
  );
}

export async function isBackgroundProximityEnabled(): Promise<boolean> {
  return Location.hasStartedGeofencingAsync(BACKGROUND_PROXIMITY_TASK);
}

export async function getBackgroundLocationMetrics(): Promise<BackgroundLocationMetrics> {
  return readMetrics();
}
