"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Flag,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@hunty/ui";
import { Card, CardDescription, CardTitle } from "@hunty/ui";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import type {
  AutoFlagReason,
  ContentPolicyViolation,
  ModerationSubmission,
} from "@/lib/moderation/types";

const POLICY_OPTIONS: { value: ContentPolicyViolation; label: string }[] = [
  { value: "profanity", label: "Profanity" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "spam", label: "Spam" },
  { value: "misleading", label: "Misleading" },
  { value: "illegal_content", label: "Illegal content" },
  { value: "other", label: "Other" },
];

function formatFlag(reason: AutoFlagReason): string {
  return reason.replace(/_/g, " ");
}

export default function AdminModerationPage() {
  const [submissions, setSubmissions] = useState<ModerationSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [selectedViolations, setSelectedViolations] = useState<
    Record<string, ContentPolicyViolation[]>
  >({});
  const [actingId, setActingId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/moderation?view=pending");
      if (!res.ok) throw new Error("Failed to load queue");
      const data = (await res.json()) as { submissions: ModerationSubmission[] };
      setSubmissions(data.submissions ?? []);
    } catch {
      toast.error("Could not load moderation queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const toggleViolation = (submissionId: string, violation: ContentPolicyViolation) => {
    setSelectedViolations((prev) => {
      const current = prev[submissionId] ?? [];
      const next = current.includes(violation)
        ? current.filter((v) => v !== violation)
        : [...current, violation];
      return { ...prev, [submissionId]: next };
    });
  };

  const handleApprove = async (submission: ModerationSubmission) => {
    setActingId(submission.id);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", submissionId: submission.id }),
      });
      if (!res.ok) throw new Error("Approve failed");
      toast.success(`Approved "${submission.hunt.title}"`);
      await loadQueue();
    } catch {
      toast.error("Failed to approve hunt");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (submission: ModerationSubmission) => {
    const reason = rejectReasons[submission.id]?.trim();
    if (!reason) {
      toast.error("Add a rejection reason before rejecting");
      return;
    }
    setActingId(submission.id);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          submissionId: submission.id,
          reason,
          policyViolations: selectedViolations[submission.id] ?? [],
        }),
      });
      if (!res.ok) throw new Error("Reject failed");
      toast.success(`Rejected "${submission.hunt.title}"`);
      setRejectReasons((prev) => {
        const next = { ...prev };
        delete next[submission.id];
        return next;
      });
      await loadQueue();
    } catch {
      toast.error("Failed to reject hunt");
    } finally {
      setActingId(null);
    }
  };

  const handleFlagOnly = async (submission: ModerationSubmission) => {
    const violations = selectedViolations[submission.id] ?? [];
    if (violations.length === 0) {
      toast.error("Select at least one policy violation to flag");
      return;
    }
    setActingId(submission.id);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "flag",
          submissionId: submission.id,
          policyViolations: violations,
        }),
      });
      if (!res.ok) throw new Error("Flag failed");
      toast.success("Content policy flags recorded");
      await loadQueue();
    } catch {
      toast.error("Failed to flag submission");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-16">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="ghost"
            asChild
            className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={loadQueue}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl font-bold"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh queue
          </Button>
        </div>

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-[#3737A4] via-[#5C5CFF] to-[#E87785] text-transparent bg-clip-text">
            Hunt moderation queue
          </h1>
          <p className="mt-2 text-slate-650 dark:text-slate-400">
            Review published hunts, approve or reject with a reason, and flag content policy issues.
          </p>
        </div>

        {loading ? (
          <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
            <p className="text-slate-500">Loading pending hunts…</p>
          </Card>
        ) : submissions.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-900/30 p-10 text-center">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <p className="font-medium text-slate-600 dark:text-slate-300">
              No hunts awaiting review.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {submissions.map((submission) => {
              const busy = actingId === submission.id;
              const autoFlagged = submission.autoFlags.length > 0;
              const hasPolicyFlags = submission.policyViolations.length > 0;

              return (
                <Card
                  key={submission.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                          {submission.hunt.title}
                        </CardTitle>
                        {autoFlagged && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            Auto-flagged
                          </span>
                        )}
                      </div>
                      <CardDescription className="mb-3 line-clamp-3 text-sm">
                        {submission.hunt.description}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          Hunt #{submission.huntId}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          {submission.hunt.cluesCount} clues
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          {submission.hunt.rewardType} · pool {submission.hunt.rewardPool ?? 0}
                        </span>
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Age: {(submission.hunt.ageClassification ?? "all-ages").replace("-plus", "+")}
                        </span>
                        {submission.creatorEmail && (
                          <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                            {submission.creatorEmail}
                          </span>
                        )}
                      </div>

                      {submission.autoFlags.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                            Suspicious signals
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {submission.autoFlags.map((flag) => (
                              <span
                                key={flag}
                                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300"
                              >
                                {formatFlag(flag)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(hasPolicyFlags || submission.policyViolations.length > 0) && (
                        <div className="mt-3">
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                            Policy flags
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {submission.policyViolations.map((v) => (
                              <span
                                key={v}
                                className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                              >
                                {v.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-850">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Content policy violations
                    </p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {POLICY_OPTIONS.map((opt) => {
                        const checked = (selectedViolations[submission.id] ?? []).includes(
                          opt.value
                        );
                        return (
                          <label
                            key={opt.value}
                            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                              checked
                                ? "border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => toggleViolation(submission.id, opt.value)}
                            />
                            {opt.label}
                          </label>
                        );
                      })}
                    </div>

                    <textarea
                      placeholder="Rejection reason (required to reject)…"
                      value={rejectReasons[submission.id] ?? ""}
                      onChange={(e) =>
                        setRejectReasons((prev) => ({ ...prev, [submission.id]: e.target.value }))
                      }
                      rows={2}
                      className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => handleApprove(submission)}
                        disabled={busy}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 font-bold hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(submission)}
                        disabled={busy}
                        className="flex items-center gap-2 rounded-xl font-bold"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleFlagOnly(submission)}
                        disabled={busy}
                        className="flex items-center gap-2 rounded-xl font-bold"
                      >
                        <Flag className="h-4 w-4" />
                        Flag policy
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
 