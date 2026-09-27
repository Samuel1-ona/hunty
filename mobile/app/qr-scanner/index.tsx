import React, { useState } from 'react';
import { View, StyleSheet, Button, Text } from 'react-native';
import QRCodeScanner from '../../components/QRCodeScanner';
import { addScanEntry } from '../../utils/scanHistory';
import { useRouter } from 'expo-router';

export default function QRScannerScreen() {
  const [scanned, setScanned] = useState<string | null>(null);
  const router = useRouter();

  const handleScanned = async (data: string) => {
    setScanned(data);
    await addScanEntry({ data, timestamp: Date.now() });
    router.push({ pathname: '/qr-scanner/result', params: { data } });
  };

  return (
    <View style={styles.container}>
      {scanned ? (
        <View style={styles.result}>
          <Text style={styles.label}>Scanned:</Text>
          <Text style={styles.data}>{scanned}</Text>
          <Button title="Scan Again" onPress={() => setScanned(null)} />
        </View>
      ) : (
        <QRCodeScanner onScanned={handleScanned} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  result: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  label: { fontSize: 18, marginBottom: 8 },
  data: { fontSize: 16, marginBottom: 16 },
});
