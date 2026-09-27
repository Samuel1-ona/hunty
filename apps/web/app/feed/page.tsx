import type { Metadata } from "next"
import { HuntFeed } from "@/components/HuntFeed"

export const metadata: Metadata = {
  title: "Discover Hunts — Hunty",
  description:
    "Browse trending, new, nearby, and featured scavenger hunts on Hunty. Find your next adventure!",
  openGraph: {
    title: "Discover Hunts — Hunty",
    description:
      "Browse trending, new, nearby, and featured scavenger hunts on Hunty. Find your next adventure!",
  },
}

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] dark:from-slate-900 dark:bg-slate-900 dark:to-slate-800">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Hunt Feed
            </h1>
          </div>
        </div>
      </div>

      {/* Feed content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HuntFeed
          defaultCategory="trending"
          className="w-full"
          gridColumns={{ sm: 2, lg: 3 }}
        />
      </div>
    </div>
  )
}
