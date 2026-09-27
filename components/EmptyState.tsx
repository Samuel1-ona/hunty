import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action: EmptyStateAction
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/90 p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
        {icon}
      </div>
      <h2 className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
      <div className="mt-6">
        {action.href ? (
          <Button asChild className="rounded-full px-6 py-3 text-sm font-semibold">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick} className="rounded-full px-6 py-3 text-sm font-semibold">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}
