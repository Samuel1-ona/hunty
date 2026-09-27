import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  PressableProps,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@providers/ThemeProvider';
import { ThemedCustomText } from './ThemedCustomText';
import { useHaptics } from '@hooks/useHaptics';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ThemedButtonProps extends PressableProps {
  text: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  accessibilityHint?: string;
}

const variantStyles = {
  primary: (colors: any) => ({
    backgroundColor: colors.primary,
  }),
  secondary: (colors: any) => ({
    backgroundColor: colors.secondary,
  }),
  danger: (colors: any) => ({
    backgroundColor: colors.error,
  }),
  success: (colors: any) => ({
    backgroundColor: colors.success,
  }),
  ghost: (colors: any) => ({
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  }),
};

const sizeStyles = {
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
};

const textSizeVariant = {
  sm: 'caption' as const,
  md: 'label' as const,
  lg: 'body' as const,
};

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  text,
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading,
  disabled = false,
  fullWidth = false,
  icon,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
  ...otherProps
}) => {
  const loadingState = isLoading ?? loading;
  const [pressed, setPressed] = useState(false);
  const { colors } = useTheme();
  const haptics = useHaptics();

  const variantStyle = variantStyles[variant](colors);
  const sizeStyle = sizeStyles[size];

  const containerStyle: ViewStyle = {
    ...variantStyle,
    ...sizeStyle,
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.5 : 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  const textColor =
    variant === 'ghost'
      ? colors.text
      : '#ffffff';

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loadingState, busy: loadingState }}
      onPress={(e) => {
        if (!disabled && !loadingState && onPress) {
          onPress(e);
        }
      }}
      onPressIn={() => !disabled && setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled || loading}
      style={[
        containerStyle,
        pressed && !disabled && { opacity: 0.8 },
        Array.isArray(style) ? StyleSheet.flatten(style as any) : (style as any),
      ]}
      {...otherProps}
    >
      {loadingState && <ActivityIndicator color={textColor} size={size === 'sm' ? 'small' : 'small'} />}
      {!loadingState && icon && icon}
      <ThemedCustomText
        variant={textSizeVariant[size]}
        color="text"
        lightColor={textColor}
        darkColor={textColor}
        weight="600"
      >
        {text}
      </ThemedCustomText>
    </Pressable>
  );
};
