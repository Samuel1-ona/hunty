import { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { dumpDiagnostics } from '../lib/memoryDiagnostics';

export function MemoryDiagnosticsOverlay() {
  const [diagnostics, setDiagnostics] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    const refresh = () => {
      const data = Array.from(dumpDiagnostics().entries()).map(([name, count]) => ({ name, count }));
      setDiagnostics(data);
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!__DEV__ || diagnostics.length === 0) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Text style={styles.header}>Memory Diagnostics</Text>
      {diagnostics.map(({ name, count }) => (
        <Text key={name} style={styles.item}>
          {name}: {count}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 999,
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    padding: 10,
    borderRadius: 10,
    maxWidth: 210,
  },
  header: {
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 6,
  },
  item: {
    color: '#e5e7eb',
    fontSize: 12,
    marginBottom: 2,
  },
});
