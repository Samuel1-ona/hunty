/** Shared color palette used by both web (Tailwind CSS vars) and mobile (JS objects). */
export const colors = {
  // Brand
  primary: '#3b82f6',
  primaryDark: '#60a5fa',
  secondary: '#8b5cf6',
  secondaryDark: '#a78bfa',

  // Semantic
  success: '#10b981',
  successDark: '#34d399',
  warning: '#f59e0b',
  warningDark: '#fbbf24',
  error: '#ef4444',
  errorDark: '#f87171',
  info: '#0ea5e9',
  infoDark: '#38bdf8',

  // Neutral
  background: '#ffffff',
  backgroundDark: '#1f2937',
  surface: '#f9fafb',
  surfaceDark: '#111827',
  border: '#e5e7eb',
  borderDark: '#374151',
  text: '#111827',
  textDark: '#f3f4f6',
  textMuted: '#6b7280',
  textMutedDark: '#9ca3af',

  // Badge variants
  badgePrimary: '#dbeafe',
  badgePrimaryText: '#1d4ed8',
  badgeSuccess: '#d1fae5',
  badgeSuccessText: '#065f46',
  badgeWarning: '#fef3c7',
  badgeWarningText: '#92400e',
  badgeError: '#fee2e2',
  badgeErrorText: '#991b1b',
  badgeGray: '#f3f4f6',
  badgeGrayText: '#374151',
} as const

export type ColorToken = keyof typeof colors
