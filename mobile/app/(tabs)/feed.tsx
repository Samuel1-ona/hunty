import "react-native-get-random-values";
import { useEffect, useState, StyleSheet } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import { ThemedView } from "@components/themed";
import { useHaptics } from "@hooks/useHaptics";
import { useTheme } from "@providers/ThemeProvider";
import { useToast } from "@providers/ToastProvider";
import { useWalletStore } from "@store/useStore";
import { OptimizedHuntFeed } from "@components/OptimizedHuntFeed";

export default function FeedScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const { network } = useWalletStore();
  const [pkey] = useState<string>("GD72EF...FH3W9A");

  const iosInstallDate = Application.getIosIdForVendorAsync ?? undefined;

  useEffect(() => {
    if (Platform.OS === "ios" && iosInstallDate) {
      iosInstallDate().then((id) => {
        if (!id) {
          showToast({
            message: "Enable Vendor ID in Privacy Settings for full app functionality.",
            type: "warning",
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (network === "mainnet") {
      showToast({
        message: "Connected to Mainnet: some features are limited. Switch to Testnet.",
        type: "warning",
        duration: 5000,
      });
    }
  }, [network]);

  const handleRefresh = async () => {
    haptics.triggerNotification("success");
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <OptimizedHuntFeed onRefresh={handleRefresh} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
