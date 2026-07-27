/**
 * Native (React Native / Expo) shared UI components.
 * Import as: import { Button } from '@hunty/ui/native'
 *
 * NOTE: Native component implementations live in apps/mobile/components
 * and depend on React Native / Expo APIs. This package provides the
 * platform-agnostic types; the implementations are within the mobile app.
 *
 * Type re-exports so consumers can use `@hunty/ui/native` for type checking
 * without pulling in the full React Native implementation.
 */
export type {
  SharedBadgeProps as BadgeProps,
  SharedButtonProps as ButtonProps,
  SharedCardProps as CardProps,
  SharedEmptyStateProps as EmptyStateProps,
} from "@hunty/types"
