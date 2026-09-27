"use client"

import { HUNT_CATEGORIES, type HuntCategoryId, getCategory } from "@/lib/categories"
import { cn } from "@/lib/utils"

interface CategoryPickerProps {
  value?: HuntCategoryId
  onChange: (category: HuntCategoryId | undefined) => void
  className?: string
  allowClear?: boolean
}

export function CategoryPicker({
  value,
  onChange,
  className,
  allowClear = true,
}: CategoryPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-200">Category</label>
        {allowClear && value && (
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-slate-200"
            onClick={() => onChange(undefined)}
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {HUNT_CATEGORIES.map((cat) => {
          const selected = value === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              title={cat.description}
              onClick={() => onChange(cat.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-colors",
                selected
                  ? "border-transparent text-slate-900"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
              )}
              style={
                selected
                  ? { backgroundColor: cat.bgColor, borderColor: cat.color, color: cat.color }
                  : undefined
              }
            >
              <span className="block text-xs font-semibold">{cat.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CategoryBadge({
  categoryId,
  className,
}: {
  categoryId?: HuntCategoryId | string
  className?: string
}) {
  const cat = getCategory(categoryId)
  if (!cat) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: cat.bgColor, color: cat.color }}
    >
      {cat.label}
    </span>
  )
}
