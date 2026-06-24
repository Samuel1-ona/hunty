import type { Metadata } from "next"
import { DashboardPageClient } from "@/app/dashboard/DashboardPageClient"

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app"

export const metadata: Metadata = {
  title: "Dashboard | Hunty",
  description: "Manage your hunts, view progress, and track your scavenger hunt performance on Hunty.",
  openGraph: {
    title: "Dashboard | Hunty",
    description: "Manage your hunts, view progress, and track your scavenger hunt performance on Hunty.",
  },
  alternates: {
    canonical: `${baseUrl}/dashboard`,
  },
}

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return <DashboardPageClient searchParams={resolvedSearchParams} />
}
