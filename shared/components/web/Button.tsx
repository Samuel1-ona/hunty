import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { SharedButtonProps } from '@shared/types/components'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-xs',
        md: 'h-9 px-4 py-2',
        lg: 'h-10 rounded-md px-6',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps
  extends Omit<React.ComponentProps<'button'>, 'onPointerDown'>,
    VariantProps<typeof buttonVariants>,
    Omit<SharedButtonProps, 'icon' | 'onPress'> {
  asChild?: boolean
  /** Icon rendered before label */
  icon?: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export function Button({
  label,
  variant,
  size,
  disabled,
  loading = false,
  icon,
  onClick,
  className,
  asChild = false,
  accessibilityLabel,
  testID,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-testid={testID}
      aria-label={accessibilityLabel ?? label}
      aria-busy={loading}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {!loading && icon}
      {children ?? label}
    </Comp>
  )
}
