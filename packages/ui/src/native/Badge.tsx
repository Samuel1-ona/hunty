import type { BadgeVariant, SharedBadgeProps } from "@hunty/types";
import React from "react";
import { StyleSheet, View } from "react-native";

import { colors as tokenColors } from "../tokens/colors";
import { ThemedCustomText } from "./ThemedCustomText";

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: tokenColors.badgePrimary, text: tokenColors.badgePrimaryText },
  success: { bg: tokenColors.badgeSuccess, text: tokenColors.badgeSuccessText },
  warning: { bg: tokenColors.badgeWarning, text: tokenColors.badgeWarningText },
  error: { bg: tokenColors.badgeError, text: tokenColors.badgeErrorText },
  gray: { bg: tokenColors.badgeGray, text: tokenColors.badgeGrayText },
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BadgeProps extends SharedBadgeProps {}

export function Badge({ label, variant = "gray", testID }: BadgeProps) {
  const { bg, text } = variantColors[variant];

  return (
    <View testID={testID} style={[styles.container, { backgroundColor: bg }]}>
      <ThemedCustomText variant="caption" lightColor={text} darkColor={text} weight="500">
        {label}
      </ThemedCustomText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
});
