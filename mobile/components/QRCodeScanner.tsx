import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Camera, CameraType, FlashMode, BarCodeScanner } from 'expo-camera';
import { useRouter } from 'expo-router';

export default function QRCodeScanner({ onScanned }: { onScanned: (data: string) => void }) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flash, setFlash] = useState<FlashMode>(FlashMode.off);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = useCallback(
    ({ data }: BarCodeScanner.Result) => {
      onScanned(data);
      router.push({ pathname: '/qr-scanner/result', params: { data } });
    },
    [onScanned, router]
  );

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Camera permission denied.</Text>
        <TouchableOpacity
          onPress={() => Camera.requestCameraPermissionsAsync().then(r => setHasPermission(r.status === 'granted'))}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        type={CameraType.back}
        flashMode={flash}
        onBarCodeScanned={handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            onPress={() => setFlash(flash === FlashMode.torch ? FlashMode.off : FlashMode.torch)}
            style={styles.flashButton}
          >
            <Text style={styles.flashText}>{flash === FlashMode.torch ? 'Flash On' : 'Flash Off'}</Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 30 },
  flashButton: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8 },
  flashText: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  error: { color: '#f00', marginBottom: 20 },
  button: { backgroundColor: '#0066ff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
