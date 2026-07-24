"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
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
