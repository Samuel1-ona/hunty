import React from 'react'
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import { useTheme } from '@providers/ThemeProvider'
import type { SharedCardProps } from '@shared/types/components'

export interface CardProps extends SharedCardProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function Card({ children, variant = 'default', onPress, testID, style }: CardProps) {
  const { colors } = useTheme()

  const baseStyle: ViewStyle = {
    borderRadius: 12,
    overflow: 'hidden',
    ...(variant === 'default' && {
      backgroundColor: colors.surface ?? colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    }),
    ...(variant === 'flat' && {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    }),
    ...(variant === 'ghost' && {
      backgroundColor: 'transparent',
    }),
    ...(style as ViewStyle),
  }

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessible
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [baseStyle, pressed && { opacity: 0.85 }]}
      >
        {children}
      </Pressable>
    )
  }

  return (
    <View testID={testID} style={baseStyle}>
      {children}
    </View>
  )
}

export function CardHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.header, style]}>{children}</View>
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={style}>{children}</View>
}

export function CardContent({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.content, style]}>{children}</View>
}

export function CardFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.footer, style]}>{children}</View>
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  footer: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
})
