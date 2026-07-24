import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, type ThemePreference } from "@providers/ThemeProvider";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "light",  label: "Light",  description: "Always use light mode",   icon: "sunny-outline" },
  { value: "dark",   label: "Dark",   description: "Always use dark mode",    icon: "moon-outline" },
  { value: "system", label: "System", description: "Follow device setting",   icon: "phone-portrait-outline" },
];

export default function ThemeScreen() {
  const { themePreference, setThemePreference, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.heading, { color: colors.text }]}>Theme</Text>
      <Text style={[styles.sub, { color: colors.secondary }]}>
        Choose how Hunty looks on this device.
      </Text>

      <View style={[styles.card, { borderColor: colors.border }]}>
        {OPTIONS.map((opt, i) => {
          const selected = themePreference === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.row,
                { backgroundColor: colors.background },
                i < OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              onPress={() => setThemePreference(opt.value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.border },
                  selected && { backgroundColor: colors.primary + "22" },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={selected ? colors.primary : colors.secondary}
                />
              </View>
              <View style={styles.textWrap}>
                <Text
                  style={[
                    styles.label,
                    { color: colors.text },
                    selected && { color: colors.primary },
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={[styles.description, { color: colors.secondary }]}>
                  {opt.description}
                </Text>
              </View>
              {selected && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 8,
  },
  sub: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
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
});
