"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { RegisteredHunt } from "../types";

const REGISTRATION_STATUS_STYLES: Record<
  RegisteredHunt["status"],
  { badge: string; dot: string }
> = {
  Registered: {
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-400",
  },
  "In Progress": {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
  },
  Completed: {
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-400",
  },
};

export function RegistrationCard({ registration }: { registration: RegisteredHunt }) {
  const { badge, dot } = REGISTRATION_STATUS_STYLES[registration.status];
  const isCompleted = registration.status === "Completed";
  const isActive = registration.status === "In Progress";

  return (
    <Card className="border border-slate-200 bg-white/80 shadow-sm">
      <CardContent className="py-4 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
          <div>
            <p className="font-semibold text-slate-900 text-sm md:text-base">
              {registration.title}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Starts:{" "}
              <span className="font-medium text-slate-700">
                {new Date(registration.startTime * 1000).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badge}`}
          >
            {registration.status}
          </span>

          {isCompleted ? (
            <Link href={`/hunt/${registration.huntId}/leaderboard`}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-full border-slate-300 hover:bg-slate-50"
              >
                Leaderboard
              </Button>
            </Link>
          ) : isActive ? (
            <Link href={`/hunt/${registration.huntId}`}>
              <Button
                size="sm"
                className="text-xs rounded-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Play Now
              </Button>
            </Link>
          ) : (
            <Link href={`/hunt/${registration.huntId}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-full border-slate-300 hover:bg-slate-50"
              >
                View Hunt
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
