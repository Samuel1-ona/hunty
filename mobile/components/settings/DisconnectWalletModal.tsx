import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@providers/ThemeProvider";

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
};

export function DisconnectWalletModal({ visible, onCancel, onConfirm, isLoading }: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      accessibilityViewIsModal={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.error + "18" }]}>
            <Ionicons name="wallet-outline" size={28} color={colors.error} />
          </View>

          <Text
            accessible={true}
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            Disconnect Wallet
          </Text>
          <Text accessible={true} style={[styles.body, { color: colors.secondary }]}>
            You'll be signed out and your wallet will be unlinked from this
            device. Your assets remain safe on-chain.
          </Text>

          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Confirm disconnect wallet"
            accessibilityHint="Disconnects your wallet from this device"
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
            style={[styles.confirmBtn, { backgroundColor: colors.error }]}
            onPress={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>Yes, Disconnect</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            accessibilityHint="Closes dialog without disconnecting"
            style={styles.cancelBtn}
            onPress={onCancel}
          >
            <Text style={[styles.cancelText, { color: colors.secondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  cancelBtn: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
  },
});
