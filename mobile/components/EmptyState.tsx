import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@providers/ThemeProvider';
import { ThemedCustomText, ThemedButton, ThemedView } from '@components/themed';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: EmptyStateAction;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  const { colors } = useTheme();

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.illustration}>
        <View style={[styles.iconCircle, { backgroundColor: colors.border + '40', borderColor: colors.border }]}>
          <ThemedCustomText style={styles.iconText}>{icon}</ThemedCustomText>
        </View>
      </View>
      <ThemedCustomText variant="h3" color="text" weight="700" style={styles.title}>
        {title}
      </ThemedCustomText>
      <ThemedCustomText variant="body" color="text" style={styles.description}>
        {description}
      </ThemedCustomText>
      {action && (
        <ThemedButton
          text={action.label}
          variant="primary"
          size="md"
          onPress={action.onPress}
          fullWidth
        />
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 12,
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
    marginBottom: 4,
  },
});
