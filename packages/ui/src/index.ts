/**
 * @hunty/ui — Shared UI component library
 *
 * This package provides a stable import path for shared UI components.
 * The canonical source lives in the monorepo's shared/ directory and is
 * re-exported from here for cross-package consumption.
 */

// Design tokens (platform-agnostic)
export * from "./tokens/index"

// Shared hooks
export * from "./hooks/index"

// Web components
export * from "./web/index"

// NOTE: Native components are exported from "@hunty/ui/native" to avoid
// pulling React Native deps into web builds.

