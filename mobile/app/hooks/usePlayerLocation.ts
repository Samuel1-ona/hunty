import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';

export type PlayerLocation = {
  latitude: number;
  longitude: number;
};

export type LocationState = {
  location: PlayerLocation | null;
  error: string | null;
  loading: boolean;
  permissionGranted: boolean;
  shareLocation: boolean;
  setShareLocation: (value: boolean) => void;
};

export function usePlayerLocation(): LocationState {
  const [location, setLocation] = useState<PlayerLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionGranted(false);
        setError('Location permission denied.');
        setLoading(false);
        return;
      }

      setPermissionGranted(true);

      try {
        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ latitude: initial.coords.latitude, longitude: initial.coords.longitude });
        setError(null);
      } catch {
        setError('Unable to resolve your current location.');
      } finally {
        setLoading(false);
      }

      if (!shareLocation) {
        return;
      }

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        (pos) => {
          setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setError(null);
        },
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, [shareLocation]);

  return useMemo(
    () => ({
      location,
      error,
      loading,
      permissionGranted,
      shareLocation,
      setShareLocation,
    }),
    [error, loading, location, permissionGranted, shareLocation],
  );
}
