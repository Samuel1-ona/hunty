/**
 * SkeletonBase — Issue #179
 *
 * A single shimmer-animated rectangle used to compose skeleton screens.
 * Built with react-native-reanimated's withRepeat / withSequence so there
 * are no extra dependencies beyond what is already in package.json.
 *
 * Usage:
 *   <SkeletonBase width={200} height={16} borderRadius={4} />
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@providers/ThemeProvider';

interface SkeletonBaseProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const DURATION = 900;

export function SkeletonBase({ width, height, borderRadius = 6, style }: SkeletonBaseProps) {
  const { isDark } = useTheme();

  const baseColor = isDark ? '#374151' : '#e5e7eb';
  const highlightColor = isDark ? '#4b5563' : '#f3f4f6';

  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: DURATION, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
