/**
 * Platform-agnostic prop interfaces for shared UI components.
 * Web and native implementations accept these same props,
 * plus any platform-specific extras they need.
 */

// ─── Button ──────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'destructive'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface SharedButtonProps {
  /** Visible label text */
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  /** Optional icon rendered before the label */
  icon?: unknown // React.ReactNode on both platforms
  onPress?: () => void
  /** Accessibility label (defaults to `label`) */
  accessibilityLabel?: string
  testID?: string
}

// ─── Card ────────────────────────────────────────────────────────────────────

export interface SharedCardProps {
  /** Card content */
  children: unknown // React.ReactNode
  /** Visual style variant */
  variant?: 'default' | 'flat' | 'ghost'
  /** Optional press handler — makes the card tappable */
  onPress?: () => void
  testID?: string
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'gray'

export interface SharedBadgeProps {
  label: string
  variant?: BadgeVariant
  testID?: string
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

export interface SharedEmptyStateAction {
  label: string
  onPress: () => void
}

export interface SharedEmptyStateProps {
  /** Emoji or icon glyph displayed in the centre circle */
  icon: string
  title: string
  description: string
  action?: SharedEmptyStateAction
  testID?: string
}
