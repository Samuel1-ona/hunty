import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { SharedCardProps } from '@shared/types/components'

const cardVariants = cva(
  'flex flex-col rounded-xl text-card-foreground',
  {
    variants: {
      variant: {
        default: 'bg-[#FAFAFAD9] border shadow-sm',
        flat: 'bg-card border',
        ghost: 'bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface CardProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof cardVariants>,
    Omit<SharedCardProps, 'children' | 'onPress'> {
  children: React.ReactNode
  onPress?: () => void
}

export function Card({ variant, className, children, onPress, testID, ...props }: CardProps) {
  const interactiveProps = onPress
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: onPress,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') onPress()
        },
      }
    : {}

  return (
    <div
      data-testid={testID}
      className={cn(cardVariants({ variant }), onPress && 'cursor-pointer', className)}
      {...interactiveProps}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-6 pt-6 pb-2', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('font-semibold leading-none', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-muted-foreground text-sm', className)} {...props} />
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-6 py-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center px-6 pb-6', className)} {...props} />
}
