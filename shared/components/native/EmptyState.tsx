import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '@providers/ThemeProvider'
import { ThemedCustomText } from '@components/themed/ThemedCustomText'
import { Button } from './Button'
import type { SharedEmptyStateProps } from '@shared/types/components'

export interface EmptyStateProps extends SharedEmptyStateProps {}

export function EmptyState({ icon, title, description, action, testID }: EmptyStateProps) {
  const { colors } = useTheme()

  return (
    <View testID={testID} style={styles.container}>
      <View style={[styles.iconCircle, { borderColor: colors.border, backgroundColor: colors.border + '40' }]}>
        <ThemedCustomText style={styles.iconText}>{icon}</ThemedCustomText>
      </View>
      <ThemedCustomText variant="h3" weight="700" style={styles.title}>
        {title}
      </ThemedCustomText>
      <ThemedCustomText variant="body" style={styles.description}>
        {description}
      </ThemedCustomText>
      {action && (
        <Button label={action.label} variant="primary" size="md" onPress={action.onPress} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 12,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconText: { fontSize: 40 },
  title: { textAlign: 'center' },
  description: { textAlign: 'center', opacity: 0.7, lineHeight: 22, marginBottom: 4 },
})
