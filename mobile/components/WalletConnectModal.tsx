import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedCustomText, ThemedButton } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';

interface WalletConnectModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (provider: 'xbull' | 'lobstr') => void;
}

const WALLET_OPTIONS = [
  {
    id: 'xbull' as const,
    name: 'xBull Wallet',
    description: 'Stellar mobile wallet with deep linking',
  },
  {
    id: 'lobstr' as const,
    name: 'Lobstr',
    description: 'Popular Stellar wallet for iOS and Android',
  },
];

export function WalletConnectModal({
  visible,
  onClose,
  onConnect,
}: WalletConnectModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID="wallet-connect-modal"
    >
      <View style={styles.overlay}>
        <View
          style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}
        >
          <ThemedCustomText variant="h2" style={styles.title}>
            Connect a wallet
          </ThemedCustomText>
          <ThemedCustomText variant="body" style={styles.subtitle}>
            Choose a Stellar wallet to join hunts and claim rewards.
          </ThemedCustomText>

          {WALLET_OPTIONS.map((wallet) => (
            <Pressable
              key={wallet.id}
              testID={`wallet-option-${wallet.id}`}
              onPress={() => onConnect(wallet.id)}
              style={[styles.option, { borderColor: colors.border }]}
            >
              <ThemedCustomText variant="label" weight="600">
                {wallet.name}
              </ThemedCustomText>
              <ThemedCustomText variant="caption">{wallet.description}</ThemedCustomText>
            </Pressable>
          ))}

          <ThemedButton
            text="Cancel"
            variant="ghost"
            onPress={onClose}
            fullWidth
            testID="wallet-modal-cancel"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 4,
  },
  option: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
});
