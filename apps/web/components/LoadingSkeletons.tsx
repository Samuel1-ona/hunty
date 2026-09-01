"use client"

import { Card } from "@hunty/ui"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type SkeletonCountProps = {
  count?: number
  className?: string
}

export function HuntCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-hidden="true"
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800",
        className
      )}
    >
      <Skeleton className="h-40 w-full rounded-none bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-4 w-full bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-4 w-14 bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </Card>
  )
}

export function HuntCardSkeletonGrid({ count = 4, className }: SkeletonCountProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <HuntCardSkeleton key={`hunt-card-skeleton-${index}`} />
      ))}
    </div>
  )
}

export function LeaderboardRowSkeleton() {
  return (
    <tr className="bg-white dark:bg-slate-900" aria-hidden="true">
      <td className="flex items-center justify-center gap-2 border-r-2 border-b-2 border-[#808080] px-4 py-3 text-center dark:border-slate-700">
        <Skeleton className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800" />
        <Skeleton className="h-5 w-4 bg-slate-200 dark:bg-slate-800" />
      </td>
      <td className="border-r-2 border-b-2 border-[#808080] px-4 py-3 dark:border-slate-700">
        <Skeleton className="h-5 w-1/2 bg-slate-200 dark:bg-slate-800" />
      </td>
      <td className="border border-b-2 border-[#808080] px-4 py-3 text-center dark:border-slate-700">
        <Skeleton className="mx-auto h-5 w-8 bg-slate-200 dark:bg-slate-800" />
      </td>
    </tr>
  )
}

export function LeaderboardTableSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <LeaderboardRowSkeleton key={`leaderboard-row-skeleton-${index}`} />
      ))}
    </>
  )
}

export function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      <Skeleton className="h-4 w-28 bg-slate-200 dark:bg-slate-700" />
      <Skeleton className="h-11 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

export function ProfileSectionSkeleton({ className }: { className?: string }) {
  return (
    <section
      aria-hidden="true"
      className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900", className)}
    >
      <div className="mb-5 flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`profile-stat-skeleton-${index}`} className="rounded-xl border border-slate-100 p-3 dark:border-white/10">
            <Skeleton className="mb-2 h-4 w-16 bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-7 w-12 bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading profile">
      <ProfileSectionSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileSectionSkeleton />
        <ProfileSectionSkeleton />
      </div>
    </div>
  )
}

export function HuntPageSkeletonLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] p-4 dark:from-slate-900 dark:bg-slate-900 dark:to-slate-800">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center">
        <div className="w-full rounded-3xl border border-slate-100 bg-white px-8 py-10 shadow-lg dark:border-white/5 dark:bg-slate-900">
          <div className="mb-8 space-y-3 text-center">
            <Skeleton className="mx-auto h-8 w-3/4 bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-4 w-full bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="mx-auto h-4 w-5/6 bg-slate-100 dark:bg-slate-800" />
          </div>
          <HuntCardSkeleton className="mx-auto border-blue-200 dark:border-blue-900/40" />
        </div>
      </div>
    </div>
  )
}

export function FormPageSkeletonLayout() {
  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900" aria-label="Loading form">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </div>
      <FormFieldSkeleton />
      <FormFieldSkeleton />
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  )
}

export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-label="Loading admin table" role="status">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-48 bg-slate-200 dark:bg-slate-700" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-10 w-28 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50 flex gap-4">
          <Skeleton className="h-5 w-1/4 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-5 w-1/4 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-5 w-1/4 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-5 w-1/4 bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={`admin-table-row-${i}`} className="p-4 flex items-center justify-between gap-4">
              <Skeleton className="h-5 w-1/3 bg-slate-200 dark:bg-slate-800" />
              <Skeleton className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
              <Skeleton className="h-5 w-1/4 bg-slate-200 dark:bg-slate-800" />
              <Skeleton className="h-8 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function StatsCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading statistics" role="status">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`stats-card-${i}`}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28 bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
          <Skeleton className="h-8 w-20 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-3 w-36 bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  )
}

export function GalleryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-8" aria-label="Loading gallery" role="status">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={`gallery-tag-${i}`} className="h-9 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      <HuntCardSkeletonGrid count={count} />
    </div>
  )
}

export function TemplateCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading templates" role="status">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`template-skeleton-${i}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-5 w-3/4 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-4 w-full bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-9 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  )
}

export function ProfileHistorySkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-label="Loading profile history" role="status">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40 bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-5 w-24 bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={`history-item-${i}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-1/3 bg-slate-200 dark:bg-slate-700" />
              <Skeleton className="h-4 w-1/4 bg-slate-200 dark:bg-slate-700" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DetailHeaderSkeleton() {
  return (
    <div className="space-y-4 pb-6" aria-label="Loading header details" role="status">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <Skeleton className="h-10 w-2/3 bg-slate-200 dark:bg-slate-700" />
      <Skeleton className="h-5 w-full bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

export function GenericPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-50 to-[#f9f9ff] p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900" aria-label="Loading" role="status">
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64 bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-20 w-full rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Skeleton className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <span className="sr-only" aria-live="polite">Loading content...</span>
    </div>
  )
}

