import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@providers/ThemeProvider';

interface ThemedViewProps extends ViewProps {
  lightColor?: string;
  darkColor?: string;
}

export const ThemedView: React.FC<ThemedViewProps> = ({
  style,
  lightColor,
  darkColor,
  ...otherProps
}) => {
  const { isDark, colors } = useTheme();
  const backgroundColor = isDark ? (darkColor || colors.background) : (lightColor || colors.background);

  return (
    <View
      style={[
        { backgroundColor },
        Array.isArray(style) ? StyleSheet.flatten(style) : style,
      ]}
      {...otherProps}
    />
  );
};
