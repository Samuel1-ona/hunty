import type { BadgeVariant, SharedBadgeProps } from '@hunty/types';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors as tokenColors } from '../tokens/colors';

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: tokenColors.badgePrimary, text: tokenColors.badgePrimaryText },
  success: { bg: tokenColors.badgeSuccess, text: tokenColors.badgeSuccessText },
  warning: { bg: tokenColors.badgeWarning, text: tokenColors.badgeWarningText },
  error: { bg: tokenColors.badgeError, text: tokenColors.badgeErrorText },
  gray: { bg: tokenColors.badgeGray, text: tokenColors.badgeGrayText },
};

export type BadgeProps = SharedBadgeProps;

export function Badge({ label, variant = 'gray', testID }: BadgeProps) {
  const { bg, text } = variantColors[variant];

  return (
    <View testID={testID} style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
