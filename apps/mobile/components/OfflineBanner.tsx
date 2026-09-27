import { useTheme } from '@providers/ThemeProvider';
import React from 'react';
import { StyleSheet,Text, View } from 'react-native';

export const OfflineBanner: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.error + '20', borderColor: colors.error },
      ]}
    >
      <Text style={[styles.text, { color: colors.error }]}>
        You are offline – data will sync when connection is restored.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
