import type { ButtonSize, ButtonVariant, SharedButtonProps } from "@hunty/types";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  View,
  type ViewStyle,
} from "react-native";

import { ThemedCustomText } from "./ThemedCustomText";
import { useTheme } from "./ThemeProvider";

export interface ButtonProps
  extends Omit<PressableProps, "style" | "disabled" | "onPress">,
    SharedButtonProps {
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
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  onPress,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const { colors } = useTheme();

  const bgColor: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.secondary,
    ghost: "transparent",
    outline: "transparent",
    destructive: colors.error,
  };

  const isGhostLike = variant === "ghost" || variant === "outline";

  const containerStyle: ViewStyle = {
    ...sizeStyles[size],
    backgroundColor: bgColor[variant],
    opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...(variant === "outline" && {
      borderWidth: 1,
      borderColor: colors.border,
    }),
    ...(style as ViewStyle),
  };

  const textColor = isGhostLike ? colors.text : "#ffffff";

  return (
    <Pressable
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress ? () => onPress() : undefined}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={containerStyle}
    >
      {loading && <ActivityIndicator color={textColor} size="small" />}
      {!loading && icon && <View>{icon as React.ReactElement}</View>}
      {!loading && (
        <ThemedCustomText
          variant={size === "sm" ? "caption" : size === "lg" ? "body" : "label"}
          lightColor={textColor}
          darkColor={textColor}
          weight="600"
        >
          {label}
        </ThemedCustomText>
      )}
    </Pressable>
  );
}
