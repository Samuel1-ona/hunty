import type { SharedEmptyStateProps } from "@hunty/types";
import React from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";

import { colors as tokenColors } from "../tokens/colors";
import { Button } from "./Button";

export type EmptyStateProps = SharedEmptyStateProps;

export function EmptyState({ icon, title, description, action, testID }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const borderColor = isDark ? tokenColors.borderDark : tokenColors.border;
  const textColor = isDark ? tokenColors.textDark : tokenColors.text;

  return (
    <View testID={testID} style={styles.container}>
      <View style={[styles.iconCircle, { borderColor, backgroundColor: borderColor + "40" }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Text style={[styles.description, { color: textColor }]}>{description}</Text>
      {action && (
        <Button label={action.label} variant="primary" size="md" onPress={action.onPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 12,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconText: { fontSize: 40 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 4,
  },
});
