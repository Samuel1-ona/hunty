import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function QRCodeScanner({ onScanned }: { onScanned: (data: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = React.useState(false);
  const router = useRouter();

  const handleCodeScanned = useCallback(
    (event: { data: string }) => {
      onScanned(event.data);
    },
    [onScanned],
  );

  if (permission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No access to camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flash}
        onBarcodeScanned={handleCodeScanned}
      >
        <View style={styles.overlay}>
          <TouchableOpacity onPress={() => setFlash(!flash)} style={styles.flashButton}>
            <Text style={styles.flashText}>{flash ? 'Flash On' : 'Flash Off'}</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
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
  button: {
    backgroundColor: '#0066ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
