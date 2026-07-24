import { useState } from 'react';
import { Modal, StyleSheet, TextInput, View } from 'react-native';
import { ThemedButton, ThemedCustomText } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';

interface PinPromptModalProps {
  visible: boolean;
  title: string;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (pin: string) => Promise<boolean>;
}

export function PinPromptModal({ visible, title, error, onCancel, onSubmit }: PinPromptModalProps) {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const result = await onSubmit(pin);
      if (result) {
        setPin('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}> 
          <ThemedCustomText variant="h2" style={styles.title}>
            {title}
          </ThemedCustomText>
          <ThemedCustomText variant="caption" style={styles.subtitle}>
            Enter your PIN to authorize this action.
          </ThemedCustomText>

          <TextInput
            value={pin}
            onChangeText={setPin}
            placeholder="Enter PIN"
            secureTextEntry
            keyboardType="number-pad"
            placeholderTextColor={colors.secondary}
            accessibilityLabel="PIN code input"
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
            ]}
          />

          {error ? (
            <ThemedCustomText variant="caption" color="error" style={styles.errorText}>
              {error}
            </ThemedCustomText>
          ) : null}

          <ThemedButton text="Confirm" onPress={handleSubmit} fullWidth isLoading={isLoading} />
          <ThemedButton text="Cancel" onPress={onCancel} variant="ghost" fullWidth />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: 16,
  },
  sheet: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    width: '100%',
  },
  errorText: {
    marginBottom: 8,
  },
});
