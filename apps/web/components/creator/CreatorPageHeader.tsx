"use client";

import { Button } from "@hunty/ui";
import { ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";

export function CreatorPageHeader() {
  return (
    <>
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          asChild
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Game Arcade
          </Link>
        </Button>
      </div>

      <h1 className="mb-2 text-3xl font-bold bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text flex items-center gap-3">
        My Hunts
        <Button
          variant="ghost"
          size="sm"
          className="text-xs font-semibold text-[#3737A4] dark:text-indigo-400 hover:underline gap-1.5 flex items-center p-1 h-auto"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("start-onboarding-tour", { detail: { tourType: "creator" } })
            )
          }
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Take Tour
        </Button>
      </h1>
      <p className="mb-6 text-slate-600">
        View and manage hunts you have created. Draft hunts open in Edit; Active hunts open Live
        Statistics.
      </p>
    </>
  );
}
