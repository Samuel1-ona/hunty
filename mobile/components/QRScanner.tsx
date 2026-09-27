import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
}

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = 250;

export const QRScanner: React.FC<QRScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan QR Code',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  const scanLineY = useSharedValue(0);

  useEffect(() => {
    scanLineY.value = 0;
    scanLineY.value = withRepeat(
      withTiming(SCAN_AREA_SIZE - 4, {
        duration: 2500,
        easing: Easing.linear,
      }),
      -1,
      true
    );
    return () => {
      scanLineY.value = 0;
    };
  }, [isOpen, scanLineY]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  useEffect(() => {
    if (isOpen && !permission?.granted) {
      requestPermission();
    }
  }, [isOpen, permission?.granted, requestPermission]);

  useEffect(() => {
    if (isOpen) {
      setScanned(false);
      setIsInitializing(true);
      const timer = setTimeout(() => setIsInitializing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBarCodeScanned = ({ data }: { data: string; type?: string }) => {
    if (!scanned) {
      setScanned(true);
      onScan(data);
      setTimeout(onClose, 800);
    }
  };

  if (!isOpen) return null;

  if (!permission) {
    return (
      <View
        accessible={true}
        accessibilityLabel="Camera permission required"
        style={styles.container}
      >
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>
            Camera permission is required
          </Text>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission"
            accessibilityHint="Opens system permission dialog for camera access"
            style={styles.permissionButton}
            onPress={() => requestPermission()}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        accessible={true}
        accessibilityLabel="Camera access denied"
        style={styles.container}
      >
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>
            Camera access denied
          </Text>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Enable camera access"
            accessibilityHint="Requests camera permission again"
            style={styles.permissionButton}
            onPress={() => requestPermission()}
          >
            <Text style={styles.buttonText}>Enable Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: 'white' }]}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View accessible={true} accessibilityLabel="QR code scanner active" style={styles.container}>
      {isInitializing && <ActivityIndicator size="large" color="#3737A4" style={styles.loadingIndicator} />}

      <CameraView
        ref={cameraRef}
        style={[styles.camera, { opacity: isInitializing ? 0.1 : 1 }]}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        torch={torchOn ? 'on' : 'off'}
      />

      <View style={styles.overlay}>
        <View style={[styles.overlaySection, { height: (height - SCAN_AREA_SIZE) / 2 }]} />

        <View style={styles.middleSection}>
          <View style={[styles.overlaySide, { width: (width - SCAN_AREA_SIZE) / 2 }]} />

          <View style={styles.scanAreaContainer}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <Animated.View style={[styles.scanLine, scanLineStyle]} />
          </View>

          <View style={[styles.overlaySide, { width: (width - SCAN_AREA_SIZE) / 2 }]} />
        </View>

        <View style={[styles.overlaySection, { height: (height - SCAN_AREA_SIZE) / 2 }]} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text accessible={true} accessibilityRole="header" style={styles.headerTitle}>
          {title}
        </Text>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          accessibilityHint="Returns to previous screen"
          style={styles.headerCloseButton}
          onPress={onClose}
        >
          <Text style={styles.headerCloseText}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.flashContainer}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={torchOn ? 'Turn off flash' : 'Turn on flash'}
          accessibilityHint="Toggles camera flash for scanning in low light"
          style={[styles.flashButton, torchOn && styles.flashButtonActive]}
          onPress={() => setTorchOn((prev) => !prev)}
        >
          <Text style={[styles.flashIcon, torchOn && styles.flashIconActive]}>
            {torchOn ? '⚡' : '🔦'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hintContainer}>
        <Text
          accessible={true}
          accessibilityLiveRegion="polite"
          style={styles.hintText}
        >
          {scanned ? 'QR Code detected!' : 'Position the QR code within the frame'}
        </Text>
      </View>

      {scanned && (
        <ActivityIndicator
          size="large"
          color="white"
          style={styles.scanSuccessIndicator}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: '100%',
  },
  middleSection: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanAreaContainer: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderColor: '#3737A4',
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    height: 4,
    backgroundColor: '#3737A4',
    borderRadius: 2,
    opacity: 0.9,
    shadowColor: '#3737A4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 100,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerCloseButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  flashContainer: {
    position: 'absolute',
    top: 100,
    right: 16,
    zIndex: 100,
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashButtonActive: {
    backgroundColor: 'rgba(55, 55, 164, 0.7)',
  },
  flashIcon: {
    fontSize: 22,
  },
  flashIconActive: {
    fontSize: 24,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
    color: 'white',
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 50,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
    color: 'white',
  },
  headerCloseText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 28,
  },
  loadingIndicator: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  scanSuccessIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 100,
    zIndex: 101,
  },
});
