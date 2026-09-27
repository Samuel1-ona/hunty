import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@providers/ThemeProvider';

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
type TextColor = 'text' | 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info';

interface ThemedCustomTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
  lightColor?: string;
  darkColor?: string;
  weight?: 'normal' | 'bold' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
}

const variantStyles = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
};

const headingVariants = new Set<TextVariant>(['h1', 'h2', 'h3']);

export const ThemedCustomText: React.FC<ThemedCustomTextProps> = ({
  variant = 'body',
  color = 'text',
  weight,
  style,
  lightColor,
  darkColor,
  accessibilityRole,
  ...otherProps
}) => {
  const { isDark, colors } = useTheme();
  
  const colorValue = isDark
    ? (darkColor || colors[color as keyof typeof colors])
    : (lightColor || colors[color as keyof typeof colors]);

  const variantStyle = variantStyles[variant];
  const fontWeight = weight || variantStyle.fontWeight;

  const resolvedRole = accessibilityRole ?? (headingVariants.has(variant) ? 'header' : undefined);

  return (
    <Text
      accessible={true}
      accessibilityRole={resolvedRole}
      style={[
        variantStyle,
        { color: colorValue, fontWeight },
        Array.isArray(style) ? StyleSheet.flatten(style) : style,
      ]}
      {...otherProps}
    />
  );
};
