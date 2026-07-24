import React from "react";
import { View, Text, TouchableOpacity, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@providers/ThemeProvider";

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  type?: "navigate" | "toggle" | "destructive" | "link";
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
};

export function SettingsRow({
  icon,
  label,
  description,
  type = "navigate",
  value,
  onPress,
  onToggle,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const isDestructive = type === "destructive";

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole={type === "toggle" ? "switch" : "button"}
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={type === "toggle" ? { checked: value } : undefined}
      style={[styles.row, { backgroundColor: colors.background }]}
      onPress={onPress}
      activeOpacity={type === "toggle" ? 1 : 0.6}
      disabled={type === "toggle"}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.primary + "18" },
            isDestructive && { backgroundColor: colors.error + "18" },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={isDestructive ? colors.error : colors.primary}
          />
        </View>
        <View style={styles.textWrap}>
          <Text
            style={[
              styles.label,
              { color: colors.text },
              isDestructive && { color: colors.error },
            ]}
          >
            {label}
          </Text>
          {description && (
            <Text style={[styles.description, { color: colors.secondary }]}>
              {description}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.right}>
        {type === "toggle" && (
          <Switch
            accessible={true}
            accessibilityLabel={`${label} toggle`}
            accessibilityState={{ checked: value }}
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
          />
        )}
        {type === "navigate" && (
          <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
        )}
        {type === "link" && (
          <Ionicons name="open-outline" size={16} color={colors.secondary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    marginLeft: 8,
  },
});
