import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import type { SharedEmptyStateProps } from '@shared/types/components'

export interface EmptyStateProps extends SharedEmptyStateProps {
  className?: string
}

export function EmptyState({ icon, title, description, action, testID, className }: EmptyStateProps) {
  return (
    <div
      data-testid={testID}
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-8 py-16 text-center',
        className
      )}
    >
      <div className="flex size-24 items-center justify-center rounded-full border-2 border-dashed border-border text-4xl">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button
          label={action.label}
          variant="primary"
          size="md"
          onClick={action.onPress}
        />
      )}
    </div>
  )
}
