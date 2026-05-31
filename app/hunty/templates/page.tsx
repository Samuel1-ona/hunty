import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"

import { Header } from "@/components/Header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { STARTER_HUNT_TEMPLATES } from "@/lib/huntTemplates"

export default function HuntTemplatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-orange-100 pb-16">
      <Header balance="24.2453" />

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
            Pick a starter, load editable sample clues into the builder, and tailor everything before you publish.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {STARTER_HUNT_TEMPLATES.map((template) => (
            <Card
              key={template.slug}
              className="overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur"
            >
              <CardHeader className="pb-4">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">
                    {template.category}
                  </span>
                  <span>{template.estimatedDuration}</span>
                </div>
                <CardTitle className="text-2xl text-slate-900">
                  {template.title}
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
                  {template.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-6">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Sample clues
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {template.clues.map((clue, index) => (
                      <li key={clue.title} className="flex gap-3">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="leading-6">{clue.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="border-t border-slate-100 pt-6">
                <Button
                  asChild
                  className="w-full rounded-2xl bg-[#0C0C4F] py-6 text-base font-semibold text-white hover:bg-slate-800"
                >
                  <Link
                    href={`/hunty?template=${template.slug}`}
                    aria-label={`Start ${template.title}`}
                  >
                    Start from Template
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
