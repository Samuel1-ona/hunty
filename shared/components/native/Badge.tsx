import React from 'react'
import { StyleSheet, View } from 'react-native'
import { ThemedCustomText } from '@components/themed/ThemedCustomText'
import { colors as tokenColors } from '@shared/tokens/colors'
import type { SharedBadgeProps, BadgeVariant } from '@shared/types/components'

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: tokenColors.badgePrimary, text: tokenColors.badgePrimaryText },
  success: { bg: tokenColors.badgeSuccess, text: tokenColors.badgeSuccessText },
  warning: { bg: tokenColors.badgeWarning, text: tokenColors.badgeWarningText },
  error: { bg: tokenColors.badgeError, text: tokenColors.badgeErrorText },
  gray: { bg: tokenColors.badgeGray, text: tokenColors.badgeGrayText },
}

export interface BadgeProps extends SharedBadgeProps {}

export function Badge({ label, variant = 'gray', testID }: BadgeProps) {
  const { bg, text } = variantColors[variant]

  return (
    <View testID={testID} style={[styles.container, { backgroundColor: bg }]}>
      <ThemedCustomText
        variant="caption"
        lightColor={text}
        darkColor={text}
        weight="500"
      >
        {label}
      </ThemedCustomText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
})
