"use client"

import Link from "next/link"
import { ArrowLeft, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { PerformanceDashboard } from "@/components/PerformanceDashboard"

export default function AdminPerformancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-16">
      <Header balance="24.2453" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            asChild
            className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Link>
          </Button>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-6 w-6 text-[#3737A4] dark:text-indigo-400" />
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-[#3737A4] via-[#5C5CFF] to-[#E87785] text-transparent bg-clip-text">
              Performance Dashboard
            </h1>
          </div>
          <p className="text-slate-650 dark:text-slate-400">
            Core Web Vitals monitoring — LCP, FID, CLS, TTFB, INP tracking with
            trend analysis and budget alerts.
          </p>
        </div>

        <PerformanceDashboard />
      </div>
    </div>
  )
}
