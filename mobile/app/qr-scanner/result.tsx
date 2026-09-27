import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function QRResultScreen() {
  const { data } = useLocalSearchParams();
  const router = useRouter();

  // Simple validation: ensure non-empty string
  const isValid = typeof data === 'string' && data.length > 0;

  return (
    <View style={styles.container}>
      {isValid ? (
        <>
          <Text style={styles.title}>Scanned QR Code</Text>
          <Text style={styles.code}>{data}</Text>
          <Button title="Back to Scan" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Text style={styles.error}>Invalid QR code data.</Text>
          <Button title="Back to Scan" onPress={() => router.back()} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  code: { fontSize: 16, marginBottom: 20 },
  error: { color: '#ff4444', fontSize: 18, marginBottom: 20 },
});
