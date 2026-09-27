/**
 * Shared component library entry point.
 *
 * Platform-specific consumers should import from the appropriate sub-path:
 *   Web:    import { Button } from '@shared/components/web'
 *   Native: import { Button } from '@shared/components/native'
 *
 * Tokens, types, and hooks are platform-agnostic and may be imported from
 * this top-level barrel or from their specific sub-paths.
 */

// Design tokens
export * from './tokens'

// Shared types
export * from './types/components'

// Shared hooks
export * from './hooks'
