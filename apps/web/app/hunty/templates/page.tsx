import { ArrowLeft, Sparkles } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Header } from "@/components/Header"
import { Button } from "@hunty/ui"
import { HuntTemplatesGallery } from "@/components/HuntTemplatesGallery"

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app"

export const metadata: Metadata = {
  title: "Hunt Templates | Hunty",
  description: "Browse starter scavenger hunt templates. Pick a template, customize the clues, and publish your own blockchain-powered treasure hunt.",
  openGraph: {
    title: "Hunt Templates | Hunty",
    description: "Browse starter scavenger hunt templates. Pick a template, customize the clues, and publish your own blockchain-powered treasure hunt.",
  },
  alternates: {
    canonical: `${baseUrl}/hunty/templates`,
  },
}

export default function HuntTemplatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-orange-100 pb-16">
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          asChild
          className="mb-6 flex items-center gap-2 text-slate-700 hover:text-slate-900"
        >
          <Link href="/hunty">
            <ArrowLeft className="h-4 w-4" />
            Back to Hunt Builder
          </Link>
        </Button>

        <div className="mb-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            Quick-start templates
          </div>
          <h1 className="mb-3 text-4xl font-bold text-slate-900">
            Start with a hunt idea, not a blank page
          </h1>
          <p className="text-lg text-slate-600">
            Pick a starter, filter by category, load editable sample clues into the builder, and tailor everything before you publish.
          </p>
        </div>

        <HuntTemplatesGallery />
      </div>
    </div>
  )
}
