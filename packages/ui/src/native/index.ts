/**
 * Native (React Native / Expo) shared UI components.
 * Import as: import { Button } from '@hunty/ui/native'
 */

// Components
export type { BadgeProps } from "./Badge";
export { Badge } from "./Badge";
export type { ButtonProps } from "./Button";
export { Button } from "./Button";
export type { CardProps } from "./Card";
export { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./Card";
export type { EmptyStateProps } from "./EmptyState";
export { EmptyState } from "./EmptyState";

// Themed primitives (useful for consumers building additional native screens)
export { ThemedCustomText } from "./ThemedCustomText";
export type { Theme, ThemePreference } from "./ThemeProvider";
export { ThemeProvider, useTheme } from "./ThemeProvider";

// Re-export shared prop types for convenience
export type {
  BadgeVariant,
  ButtonSize,
  ButtonVariant,
  SharedBadgeProps,
  SharedButtonProps,
  SharedCardProps,
  SharedEmptyStateProps,
} from "@hunty/types";
