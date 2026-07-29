import type { SharedCardProps } from "@hunty/types";
import React from "react";
import { Pressable, StyleSheet, useColorScheme, View, type ViewStyle } from "react-native";

import { colors as tokenColors } from "../tokens/colors";

export interface CardProps extends SharedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, variant = "default", onPress, testID, style }: CardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const background = isDark ? tokenColors.backgroundDark : tokenColors.background;
  const surface = isDark ? tokenColors.surfaceDark : tokenColors.surface;
  const border = isDark ? tokenColors.borderDark : tokenColors.border;

  const baseStyle: ViewStyle = {
    borderRadius: 12,
    overflow: "hidden",
    ...(variant === "default" && {
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: border,
    }),
    ...(variant === "flat" && {
      backgroundColor: background,
      borderWidth: 1,
      borderColor: border,
    }),
    ...(variant === "ghost" && {
      backgroundColor: "transparent",
    }),
    ...(style as ViewStyle),
  };

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessible
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [baseStyle, pressed && { opacity: 0.85 }]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={baseStyle}>
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={style}>{children}</View>;
}

export function CardContent({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function CardFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  footer: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center" },
});
