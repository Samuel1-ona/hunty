import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTheme } from '@providers/ThemeProvider';
import { ThemedCustomText } from '@components/themed';
import { usePlayerLocation } from '@app/hooks/usePlayerLocation';
import { buildClueZones, zoneColor, type ClueZone } from '@/lib/clueZones';
import { getAllHunts } from '@store/huntStore';
import type { StoredHunt } from '@lib/types';

const INITIAL_DELTA = 0.02;

export default function GameMapScreen() {
  const { colors, isDark } = useTheme();
  const { location, error, loading } = usePlayerLocation();
  const [selected, setSelected] = useState<ClueZone | null>(null);
  const [hunts, setHunts] = useState<StoredHunt[]>([]);

  useEffect(() => {
    getAllHunts().then(setHunts).catch(() => setHunts([]));
  }, []);

  const zones = useMemo(() => {
    if (!location) return [];
    return buildClueZones(hunts, location.latitude, location.longitude);
  }, [location, hunts]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedCustomText variant="body" style={styles.statusText}>
          Locating you…
        </ThemedCustomText>
      </View>
    );
  }

  if (error || !location) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ThemedCustomText variant="body" style={{ color: colors.error }}>
          {error ?? 'Unable to get location.'}
        </ThemedCustomText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsUserLocation
        showsMyLocationButton
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: INITIAL_DELTA,
          longitudeDelta: INITIAL_DELTA,
        }}
        onPress={() => setSelected(null)}
      >
        {zones.map((zone) => {
          const color = zoneColor(zone.rewardType);
          return (
            <React.Fragment key={zone.huntId}>
              <Circle
                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                radius={zone.radius}
                strokeColor={color}
                fillColor={`${color}33`}
                strokeWidth={2}
              />
              <Marker
                coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                pinColor={color}
                title={zone.title}
                onPress={() => setSelected(zone)}
              />
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Zone info card */}
      {selected && (
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View style={styles.infoRow}>
            <ThemedCustomText variant="h3" weight="700" style={styles.infoTitle}>
              {selected.title}
            </ThemedCustomText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              onPress={() => setSelected(null)}
              hitSlop={8}
            >
              <ThemedCustomText variant="label" style={{ color: colors.primary }}>
                ✕
              </ThemedCustomText>
            </Pressable>
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: zoneColor(selected.rewardType) }]}>
              <ThemedCustomText variant="label" lightColor="#fff" darkColor="#fff" weight="600">
                {selected.rewardType}
              </ThemedCustomText>
            </View>
            <ThemedCustomText variant="label" style={{ color: colors.text }}>
              ~{selected.radius} m zone
            </ThemedCustomText>
          </View>
        </View>
      )}

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {(['XLM', 'NFT', 'Both'] as const).map((type) => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: zoneColor(type) }]} />
            <ThemedCustomText variant="label">{type}</ThemedCustomText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  statusText: { marginTop: 8 },

  infoCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoTitle: { flex: 1, marginRight: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },

  legend: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
