import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getScannerStatusText, type ScannerCameraState, validateManualCode } from '@/lib/qrCodeScanner';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
}

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = 250;

interface ManualCodeEntryFormProps {
  onSubmit: (code: string) => void;
  onCancel: () => void;
}

/**
 * Accessible fallback that lets a user type the QR/checkpoint code by hand.
 * Validation reuses `validateManualCode` so the same rules applied to scanned
 * data are enforced on entry. Submission delegates to `onSubmit`, which the parent
 * wires to the exact same path as a successful barcode scan.
 */
const ManualCodeEntryForm: React.FC<ManualCodeEntryFormProps> = ({ onSubmit, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Move focus to the input as soon as manual entry opens.
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (submitting) return;
    const validation = validateManualCode(code);
    if (!validation.valid) {
      setError(validation.error);
      AccessibilityInfo.announceForAccessibility(validation.error ?? 'Invalid code');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      onSubmit(code.trim());
    } finally {
      setSubmitting(false);
      setCode('');
    }
  };

  return (
    <View style={styles.manualEntryForm}>
      <Text
        accessible={true}
        accessibilityRole="header"
        style={styles.manualEntryLabel}
      >
        Enter code manually
      </Text>

      <TextInput
        ref={inputRef}
        accessible={true}
        accessibilityLabel="QR code value"
        accessibilityHint="Type the code shown on your QR code"
        accessibilityRole="text"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="default"
        onSubmitEditing={handleSubmit}
        placeholder="e.g. lantern statue"
        placeholderTextColor="#94a3b8"
        returnKeyType="done"
        style={[styles.manualEntryInput, error ? styles.manualEntryInputError : null]}
        value={code}
        onChangeText={setCode}
      />

      {error ? (
        <Text
          accessible={true}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={styles.manualEntryError}
        >
          {error}
        </Text>
      ) : null}

      <View style={styles.manualEntryActions}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Submit code"
          accessibilityHint="Submits the manually entered code for this checkpoint"
          accessibilityState={{ busy: submitting, disabled: submitting }}
          style={[styles.manualEntrySubmit, submitting && styles.buttonDisabled]}
          disabled={submitting}
          onPress={handleSubmit}
        >
          <Text style={styles.buttonText}>{submitting ? 'Submitting…' : 'Submit code'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Cancel manual entry"
          accessibilityHint="Returns to the camera scanner"
          style={styles.manualEntryCancel}
          onPress={onCancel}
        >
          <Text style={[styles.buttonText, { color: '#cbd5e1' }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const renderManualEntryOrButton = (
  manualEntryVisible: boolean,
  onOpen: () => void,
  onCancel: () => void,
  onSubmit: (code: string) => void,
) => {
  if (manualEntryVisible) {
    return <ManualCodeEntryForm onSubmit={onSubmit} onCancel={onCancel} />;
  }
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Enter code manually"
      accessibilityHint="Type your QR code value without using the camera"
      style={styles.manualEntryButton}
      onPress={onOpen}
    >
      <Text style={styles.buttonText}>Enter code manually</Text>
    </TouchableOpacity>
  );
};

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
  const [scannerState, setScannerState] = useState<ScannerCameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
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
      true,
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
    if (!isOpen) return;
    setScanned(false);
    setManualEntryVisible(false);
    setCameraError(null);
    setScannerState('starting');
    setIsInitializing(true);
    const timer = setTimeout(() => {
      setIsInitializing(false);
      setScannerState((current) => (current === 'starting' || current === 'idle' ? 'ready' : current));
    }, 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Mirror permission state into scannerState and announce the permission
  // branches (their UI is rendered outside the main camera view, so the in-view
  // live region does not apply to them).
  useEffect(() => {
    if (!isOpen) return;
    if (!permission) {
      setScannerState('permission-required');
      AccessibilityInfo.announceForAccessibility('Camera permission required');
    } else if (!permission.granted) {
      setScannerState('permission-denied');
      AccessibilityInfo.announceForAccessibility('Camera access denied');
    }
  }, [isOpen, permission]);

  const handleClose = () => {
    AccessibilityInfo.announceForAccessibility(getScannerStatusText('stopped', false));
    onClose();
  };

  // Shared path used by both a real barcode scan and manual code entry so the
  // two behave identically.
  const processScan = (data: string) => {
    if (scanned) return;
    setScanned(true);
    setManualEntryVisible(false);
    setScannerState('ready');
    onScan(data);
    setTimeout(onClose, 800);
  };

  const handleBarCodeScanned = ({ data }: { data: string; type?: string }) => {
    processScan(data);
  };

  const handleManualSubmit = (code: string) => {
    processScan(code);
  };

  const openManualEntry = () => {
    setManualEntryVisible(true);
    AccessibilityInfo.announceForAccessibility('Manual code entry opened');
  };

  const closeManualEntry = () => {
    setManualEntryVisible(false);
    AccessibilityInfo.announceForAccessibility('Returned to camera scanner');
  };

  if (!isOpen) return null;

  const hintText =
    scannerState === 'error' && cameraError
      ? `Camera unavailable. ${cameraError}`
      : getScannerStatusText(scannerState, scanned);

  if (!permission) {
    return (
      <View
        accessible={true}
        accessibilityLabel="Camera permission required"
        style={styles.container}
      >
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>Camera permission is required</Text>
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

          {renderManualEntryOrButton(
            manualEntryVisible,
            openManualEntry,
            closeManualEntry,
            handleManualSubmit,
          )}

          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            style={styles.closeButton}
            onPress={handleClose}
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
          <Text style={styles.permissionText}>Camera access denied</Text>
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

          {renderManualEntryOrButton(
            manualEntryVisible,
            openManualEntry,
            closeManualEntry,
            handleManualSubmit,
          )}

          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Text style={[styles.closeButtonText, { color: 'white' }]}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View accessible={true} accessibilityLabel="QR code scanner active" style={styles.container}>
      {isInitializing && (
        <ActivityIndicator size="large" color="#3737A4" style={styles.loadingIndicator} />
      )}

      <CameraView
        ref={cameraRef}
        style={[styles.camera, { opacity: isInitializing ? 0.1 : 1 }]}
        onBarcodeScanned={handleBarCodeScanned}
        onCameraReady={() => {
          setIsInitializing(false);
          setScannerState('ready');
        }}
        onMountError={({ message }: { message: string }) => {
          setCameraError(message ?? null);
          setScannerState('error');
          setIsInitializing(false);
        }}
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
          onPress={handleClose}
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

      <View style={styles.bottomHintContainer}>
        {manualEntryVisible && !scanned ? (
          <ManualCodeEntryForm onSubmit={handleManualSubmit} onCancel={closeManualEntry} />
        ) : (
          <>
            <Text
              accessible={true}
              accessibilityLiveRegion="polite"
              style={styles.hintText}
            >{hintText}</Text>

            {!scanned && (
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Enter code manually"
                accessibilityHint="Type your QR code value instead of using the camera"
                style={styles.manualEntryButton}
                onPress={openManualEntry}
              >
                <Text style={styles.buttonText}>Enter code manually</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {scanned && (
          <ActivityIndicator size="large" color="white" style={styles.scanSuccessIndicator} />
        )}
      </View>
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
  bottomHintContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  hintText: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  manualEntryButton: {
    backgroundColor: 'rgba(55, 55, 164, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  manualEntryForm: {
    width: '100%',
    maxWidth: 400,
    marginTop: 12,
    alignItems: 'stretch',
  },
  manualEntryLabel: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  manualEntryInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    color: '#0f172a',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  manualEntryInputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  manualEntryError: {
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'center',
  },
  manualEntryActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 4,
  },
  manualEntrySubmit: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  manualEntryCancel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
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
