import { useTheme } from '@providers/ThemeProvider';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedCustomText } from './themed';

interface ARClueRevealProps {
  isOpen: boolean;
  onClose: () => void;
  onReveal: () => void;
  clueText: string;
}

const { width, height } = Dimensions.get('window');
const TARGET_AREA_SIZE = 200;

export const ARClueReveal: React.FC<ARClueRevealProps> = ({
  isOpen,
  onClose,
  onReveal,
  clueText,
}) => {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [isInitializing, setIsInitializing] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [clueRevealed, setClueRevealed] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  const pulseValue = useSharedValue(1);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withTiming(1.5, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    return () => {
      pulseValue.value = 1;
    };
  }, [isOpen, pulseValue]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
    opacity: 1 - (pulseValue.value - 1) * 0.5,
  }));

  useEffect(() => {
    if (isOpen && !permission?.granted) {
      requestPermission();
    }
  }, [isOpen, permission?.granted, requestPermission]);

  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setClueRevealed(false);
      setIsInitializing(true);
      const timer = setTimeout(() => setIsInitializing(false), 300);
      return () => clearTimeout(timer);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const handleReveal = () => {
    setClueRevealed(true);
    onReveal();
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
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close AR view"
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
      <View accessible={true} accessibilityLabel="Camera access denied" style={styles.container}>
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
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close AR view"
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
    <View accessible={true} accessibilityLabel="AR clue reveal active" style={styles.container}>
      {isInitializing && (
        <ActivityIndicator size="large" color="#3737A4" style={styles.loadingIndicator} />
      )}

      <CameraView
        ref={cameraRef}
        style={[styles.camera, { opacity: isInitializing ? 0.1 : 1 }]}
        torch={torchOn ? 'on' : 'off'}
      />

      <View style={styles.overlay}>
        <View style={[styles.overlaySection, { height: (height - TARGET_AREA_SIZE) / 2 }]} />

        <View style={styles.middleSection}>
          <View style={[styles.overlaySide, { width: (width - TARGET_AREA_SIZE) / 2 }]} />

          <View style={styles.targetAreaContainer}>
            <Animated.View style={[styles.targetRing, pulseStyle]} />
            <View style={[styles.targetRing, styles.targetRingStatic]} />

            {!clueRevealed && (
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Reveal clue"
                accessibilityHint="Shows the clue in AR view"
                style={[styles.revealButton, { backgroundColor: colors.primary }]}
                onPress={handleReveal}
              >
                <Text style={styles.revealButtonText}>🔍 Reveal Clue</Text>
              </TouchableOpacity>
            )}

            {clueRevealed && (
              <View style={[styles.clueCard, { backgroundColor: colors.background + 'EE' }]}>
                <ThemedCustomText variant="body" style={styles.clueText}>
                  {clueText}
                </ThemedCustomText>
              </View>
            )}
          </View>

          <View style={[styles.overlaySide, { width: (width - TARGET_AREA_SIZE) / 2 }]} />
        </View>

        <View style={[styles.overlaySection, { height: (height - TARGET_AREA_SIZE) / 2 }]} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text accessible={true} accessibilityRole="header" style={styles.headerTitle}>
          AR Clue Reveal
        </Text>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close AR view"
          accessibilityHint="Returns to clue screen"
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
          accessibilityHint="Toggles camera flash for better visibility"
          style={[styles.flashButton, torchOn && styles.flashButtonActive]}
          onPress={() => setTorchOn((prev) => !prev)}
        >
          <Text style={[styles.flashIcon, torchOn && styles.flashIconActive]}>
            {torchOn ? '⚡' : '🔦'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hintContainer}>
        <Text accessible={true} accessibilityLiveRegion="polite" style={styles.hintText}>
          {clueRevealed ? 'Clue revealed!' : 'Point camera at target location'}
        </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: '100%',
  },
  middleSection: {
    flexDirection: 'row',
    height: TARGET_AREA_SIZE,
  },
  overlaySide: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  targetAreaContainer: {
    width: TARGET_AREA_SIZE,
    height: TARGET_AREA_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetRing: {
    position: 'absolute',
    width: TARGET_AREA_SIZE,
    height: TARGET_AREA_SIZE,
    borderRadius: TARGET_AREA_SIZE / 2,
    borderWidth: 3,
    borderColor: '#3737A4',
  },
  targetRingStatic: {
    opacity: 0.5,
  },
  revealButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  revealButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  clueCard: {
    padding: 16,
    borderRadius: 12,
    maxWidth: TARGET_AREA_SIZE - 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  clueText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
  headerCloseText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 28,
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
  loadingIndicator: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
