"use client"

import { HUNT_CATEGORIES, type HuntCategoryId } from "@/lib/categories"
import { cn } from "@/lib/utils"

interface HuntCategoryFilterProps {
  category: HuntCategoryId | "all"
  onCategoryChange: (category: HuntCategoryId | "all") => void
  tagQuery: string
  onTagQueryChange: (tag: string) => void
  className?: string
}

export function HuntCategoryFilter({
  category,
  onCategoryChange,
  tagQuery,
  onTagQueryChange,
  className,
}: HuntCategoryFilterProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={category === "all"}
          onClick={() => onCategoryChange("all")}
          label="All"
        />
        {HUNT_CATEGORIES.map((cat) => (
          <FilterChip
            key={cat.id}
            active={category === cat.id}
            onClick={() => onCategoryChange(cat.id)}
            label={cat.label}
            color={cat.color}
            bg={cat.bgColor}
          />
        ))}
      </div>
      <input
        type="search"
        value={tagQuery}
        onChange={(e) => onTagQueryChange(e.target.value)}
        placeholder="Filter by tag (e.g. mural, outdoor)"
        className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-teal-500/50"
        aria-label="Filter by tag"
      />
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  color,
  bg,
}: {
  active: boolean
  onClick: () => void
  label: string
  color?: string
  bg?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
        active ? "border-transparent" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
      )}
      style={
        active && color && bg
          ? { backgroundColor: bg, color }
          : active
            ? { backgroundColor: "#CCFBF1", color: "#0D9488" }
            : undefined
      }
    >
      {label}
    </button>
  )
}
