import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedButton, ThemedCustomText, ThemedView } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';
import { useModalStore, type ModalConfig } from '@store/modalStore';

interface ConfirmationModalProps {
  config: ModalConfig;
  onClose: () => void;
}

function ConfirmationModal({ config, onClose }: ConfirmationModalProps) {
  const { colors } = useTheme();

  const handleConfirm = async () => {
    if (config.onConfirm) {
      await config.onConfirm();
    }
    onClose();
  };

  const handleCancel = async () => {
    if (config.onCancel) {
      await config.onCancel();
    }
    onClose();
  };

  return (
    <View style={styles.modalContent}>
      <ThemedCustomText variant="h3" style={styles.title}>
        {config.title || 'Confirm'}
      </ThemedCustomText>
      {config.message && (
        <ThemedCustomText variant="body" color="secondary" style={styles.message}>
          {config.message}
        </ThemedCustomText>
      )}
      <View style={styles.actions}>
        <ThemedButton
          text={config.cancelText || 'Cancel'}
          variant="ghost"
          size="md"
          onPress={handleCancel}
          style={styles.actionButton}
        />
        <ThemedButton
          text={config.confirmText || 'Confirm'}
          variant="primary"
          size="md"
          onPress={handleConfirm}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

interface BottomSheetWrapperProps {
  config: ModalConfig;
  isVisible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

function BottomSheetWrapper({
  config,
  isVisible,
  onClose,
  children,
}: BottomSheetWrapperProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '75%'], []);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  React.useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isVisible]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{
        backgroundColor: isDark ? '#9ca3af' : '#d1d5db',
      }}
      backgroundStyle={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          styles.keyboardAvoid,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        {children}
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const { modals, closeModal } = useModalStore();

  return (
    <BottomSheetModalProvider>
      {children}
      {modals.map((modal) => (
        <BottomSheetWrapper
          key={modal.id}
          config={modal}
          isVisible={true}
          onClose={() => closeModal(modal.id)}
        >
          {modal.type === 'confirmation' ? (
            <ConfirmationModal
              config={modal}
              onClose={() => closeModal(modal.id)}
            />
          ) : (
            <View style={styles.modalContent}>
              <ThemedCustomText variant="h3" style={styles.title}>
                {modal.title || 'Modal'}
              </ThemedCustomText>
              {/* For custom modals, we'd render the custom component here */}
            </View>
          )}
        </BottomSheetWrapper>
      ))}
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalContent: {
    gap: 16,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
});
