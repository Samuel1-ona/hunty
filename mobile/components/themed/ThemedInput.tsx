import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@providers/ThemeProvider';
import { normalizeFont, MAX_FONT_SCALE } from '@config/fontScaling';
import { ThemedCustomText } from './ThemedCustomText';

type InputSize = 'sm' | 'md' | 'lg';

interface ThemedInputProps extends Omit<TextInputProps, 'style'> {
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  size?: InputSize;
}

const sizeStyles = {
  sm: {
    minHeight: 40,
    paddingHorizontal: 12,
    fontSize: 14,
    borderRadius: 8,
  },
  md: {
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 16,
    borderRadius: 10,
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: 16,
    fontSize: 18,
    borderRadius: 12,
  },
};

export const ThemedInput: React.FC<ThemedInputProps> = ({
  error,
  helperText,
  containerStyle,
  inputStyle,
  size = 'md',
  placeholderTextColor,
  maxFontSizeMultiplier = MAX_FONT_SCALE,
  allowFontScaling = true,
  accessibilityLabel,
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const hasError = Boolean(error);
  const dimensions = sizeStyles[size];

  const derivedPlaceholderColor = placeholderTextColor || (isDark ? '#9ca3af' : '#6b7280');

  return (
    <View style={containerStyle}>
      <TextInput
        accessible={true}
        accessibilityLabel={accessibilityLabel || props.placeholder || 'Input field'}
        accessibilityHint={hasError ? error : helperText}
        accessibilityState={{ disabled: props.editable === false }}
        placeholderTextColor={derivedPlaceholderColor}
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={[
          styles.baseInput,
          {
            minHeight: dimensions.minHeight,
            paddingHorizontal: dimensions.paddingHorizontal,
            borderRadius: dimensions.borderRadius,
            fontSize: normalizeFont(dimensions.fontSize),
            color: colors.text,
            borderColor: hasError ? colors.error : colors.border,
            backgroundColor: isDark ? '#111827' : '#ffffff',
          },
          inputStyle,
        ]}
        {...props}
      />

      {hasError ? (
        <ThemedCustomText variant="caption" color="error" style={styles.feedbackText}>
          {error}
        </ThemedCustomText>
      ) : helperText ? (
        <ThemedCustomText variant="caption" color="secondary" style={styles.feedbackText}>
          {helperText}
        </ThemedCustomText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  baseInput: {
    borderWidth: 1,
    width: '100%',
  },
  feedbackText: {
    marginTop: 6,
    marginLeft: 2,
  },
});
