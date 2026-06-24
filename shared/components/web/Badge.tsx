import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { SharedBadgeProps } from '@shared/types/components'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      },
    },
    defaultVariants: { variant: 'gray' },
  }
)

export interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants>,
    SharedBadgeProps {}

export function Badge({ label, variant, className, testID, ...props }: BadgeProps) {
  return (
    <span
      data-testid={testID}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {label}
    </span>
  )
}
