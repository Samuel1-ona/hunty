import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import {
  BACKGROUND_PROXIMITY_TASK,
  buildClueRegions,
  disableBackgroundProximity,
  enableBackgroundProximity,
} from '@/services/backgroundLocation';

jest.mock('expo-location');
jest.mock('expo-notifications');
jest.mock('expo-task-manager');
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const clue = (id: number, latitude?: number, longitude?: number) => ({
  id,
  huntId: 7,
  question: 'Find it',
  answer: 'found',
  points: 10,
  latitude,
  longitude,
});

describe('background proximity', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.hasStartedGeofencingAsync as jest.Mock).mockResolvedValue(false);
  });

  it('builds regions only from valid coordinates', () => {
    expect(buildClueRegions(7, [clue(1, 6.45, 3.39), clue(2), clue(3, 91, 0)])).toEqual([
      expect.objectContaining({ identifier: '7:1', latitude: 6.45, longitude: 3.39, radius: 100 }),
    ]);
  });

  it('does not request background access after foreground access is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    await expect(enableBackgroundProximity(7, [clue(1, 6.45, 3.39)])).resolves.toEqual(
      expect.objectContaining({ enabled: false }),
    );
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('starts native geofencing for active clues', async () => {
    await expect(enableBackgroundProximity(7, [clue(1, 6.45, 3.39)])).resolves.toEqual({
      enabled: true,
      regionCount: 1,
    });
    expect(Location.startGeofencingAsync).toHaveBeenCalledWith(
      BACKGROUND_PROXIMITY_TASK,
      expect.arrayContaining([expect.objectContaining({ identifier: '7:1' })]),
    );
  });

  it('stops an active native geofence', async () => {
    (Location.hasStartedGeofencingAsync as jest.Mock).mockResolvedValue(true);
    await disableBackgroundProximity();
    expect(Location.stopGeofencingAsync).toHaveBeenCalledWith(BACKGROUND_PROXIMITY_TASK);
  });
});
