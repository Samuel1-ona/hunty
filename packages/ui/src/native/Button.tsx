import type { ButtonSize, ButtonVariant, SharedButtonProps } from '@hunty/types';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';

import { colors as tokenColors } from '../tokens/colors';

export interface ButtonProps
  extends Omit<PressableProps, 'style'>,
    Omit<SharedButtonProps, 'disabled' | 'onPress'> {
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const sizeStyles: Record<ButtonSize, ViewStyle & { borderRadius: number }> = {
  sm: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  md: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  lg: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 10 },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  onPress,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const primary = isDark ? tokenColors.primaryDark : tokenColors.primary;
  const secondary = isDark ? tokenColors.secondaryDark : tokenColors.secondary;
  const border = isDark ? tokenColors.borderDark : tokenColors.border;
  const textColor_ = isDark ? tokenColors.textDark : tokenColors.text;
  const errorColor = isDark ? tokenColors.errorDark : tokenColors.error;

  const bgColor: Record<ButtonVariant, string> = {
    primary,
    secondary,
    ghost: 'transparent',
    outline: 'transparent',
    destructive: errorColor,
  };

  const isGhostLike = variant === 'ghost' || variant === 'outline';

  const containerStyle: ViewStyle = {
    ...sizeStyles[size],
    backgroundColor: bgColor[variant],
    opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...(variant === 'outline' && {
      borderWidth: 1,
      borderColor: border,
    }),
    ...(style as ViewStyle),
  };

  const labelColor = isGhostLike ? textColor_ : '#ffffff';

  const labelFontSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;
  const labelLineHeight = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  return (
    <Pressable
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={containerStyle}
    >
      {loading && <ActivityIndicator color={labelColor} size="small" />}
      {!loading && icon && <View>{icon as React.ReactElement}</View>}
      {!loading && (
        <Text
          style={[
            styles.label,
            { color: labelColor, fontSize: labelFontSize, lineHeight: labelLineHeight },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '600',
  },
});
