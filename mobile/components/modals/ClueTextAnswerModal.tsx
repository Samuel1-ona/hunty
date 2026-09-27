import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedButton, ThemedCustomText, ThemedInput } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';
import {
  EMPTY_ANSWER_ERROR,
  isValidClueAnswer,
  normalizeClueAnswer,
} from '@lib/clueAnswerValidation';

export interface ClueTextAnswerModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (answer: string) => void | Promise<void>;
  clueTitle?: string;
  isSubmitting?: boolean;
  error?: string;
  placeholder?: string;
}

export function ClueTextAnswerModal({
  visible,
  onClose,
  onSubmit,
  clueTitle,
  isSubmitting = false,
  error: externalError,
  placeholder = 'Enter your answer',
}: ClueTextAnswerModalProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [answer, setAnswer] = useState('');
  const [emptyError, setEmptyError] = useState('');

  const resetForm = useCallback(() => {
    setAnswer('');
    setEmptyError('');
  }, []);

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  const displayError = emptyError || externalError;
  const canSubmit = isValidClueAnswer(answer) && !isSubmitting;

  const handleChange = (text: string) => {
    setAnswer(text);
    if (emptyError && isValidClueAnswer(text)) {
      setEmptyError('');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!isValidClueAnswer(answer)) {
      setEmptyError(EMPTY_ANSWER_ERROR);
      return;
    }

    await onSubmit(normalizeClueAnswer(answer));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close answer modal"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
            accessibilityRole="none"
          >
            <View style={styles.header}>
              <ThemedCustomText variant="h3" accessibilityRole="header">
                {clueTitle ? `Answer: ${clueTitle}` : 'Submit answer'}
              </ThemedCustomText>
              <Pressable
                onPress={handleClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[styles.closeButton, { borderColor: colors.border }]}
              >
                <ThemedCustomText variant="label" color="secondary">
                  ✕
                </ThemedCustomText>
              </Pressable>
            </View>

            <ThemedCustomText variant="body" color="secondary" style={styles.hint}>
              Type your solution and submit when ready.
            </ThemedCustomText>

            <ThemedInput
              value={answer}
              onChangeText={handleChange}
              placeholder={placeholder}
              autoFocus={visible}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!isSubmitting}
              error={displayError}
              accessibilityLabel="Clue answer input"
              accessibilityHint="Enter your text-based clue solution"
            />

            <View style={styles.actions}>
              <ThemedButton
                text="Cancel"
                variant="ghost"
                size="md"
                onPress={handleClose}
                disabled={isSubmitting}
                style={styles.actionButton}
                accessibilityLabel="Cancel answer submission"
              />
              <ThemedButton
                text="Submit"
                variant="primary"
                size="md"
                onPress={handleSubmit}
                disabled={!canSubmit}
                loading={isSubmitting}
                style={styles.actionButton}
                accessibilityLabel="Submit clue answer"
                accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoid: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: -8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
  },
});
