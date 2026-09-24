"use client";

import { ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";

import { getCreatorPayoutSummary } from "@/lib/payouts";
import type { PayoutRow, PayoutStatus, PayoutTransaction } from "@/lib/payouts";

type View = "summary" | "transactions";

const STATUS_LABELS: Record<PayoutStatus, string> = {
  funded: "Funded",
  paying: "Paying out",
  settled: "Settled",
  refunded: "Refunded",
};

const STATUS_STYLES: Record<PayoutStatus, string> = {
  funded: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  paying:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  settled: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  refunded: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

const TX_LABELS: Record<PayoutTransaction["type"], string> = {
  deposit: "Escrow deposit",
  sponsor: "Sponsor top-up",
  distribution: "Reward payout",
  refund: "Refund",
};

function formatXlm(value: number): string {
  return `${value.toFixed(7)} XLM`;
}

function shortenHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function ReconcileBadge({ reconciled }: { reconciled: boolean }) {
  return reconciled ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
      <CheckCircle2 className="h-3 w-3" />
      Reconciled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
      <AlertTriangle className="h-3 w-3" />
      Drift
    </span>
  );
}

export function PayoutDashboard({ creator }: { creator?: string }) {
  const [view, setView] = useState<View>("summary");

  const summary = useMemo(() => getCreatorPayoutSummary(creator), [creator]);

  const totals = useMemo(
    () => ({
      escrowed: summary.totalEscrowed,
      paid: summary.totalPaid,
      refunded: summary.totalRefunded,
      remaining: summary.totalRemaining,
    }),
    [summary]
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Payout Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Escrowed, paid and remaining per hunt, reconciled against on-chain state.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setView("summary")}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              view === "summary"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Summary
          </button>
          <button
            type="button"
            onClick={() => setView("transactions")}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              view === "transactions"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Transactions
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Escrowed" value={formatXlm(totals.escrowed)} />
        <StatCard label="Paid" value={formatXlm(totals.paid)} />
        <StatCard label="Refunded" value={formatXlm(totals.refunded)} />
        <StatCard label="Remaining" value={formatXlm(totals.remaining)} />
      </div>

      {summary.rows.length === 0 ? (
        <p className="rounded-lg bg-slate-50 py-8 text-center text-sm text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
          No escrowed hunts found.
        </p>
      ) : view === "summary" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Hunt</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 text-right font-medium">Escrowed</th>
                <th className="py-2 pr-4 text-right font-medium">Paid</th>
                <th className="py-2 pr-4 text-right font-medium">Remaining</th>
                <th className="py-2 font-medium">On-chain</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <SummaryRow key={row.huntId} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <TransactionsView rows={summary.rows} />
      )}
    </section>
  );
}

function SummaryRow({ row }: { row: PayoutRow }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
      <td className="py-3 pr-4">
        <p className="font-medium text-slate-900 dark:text-white">{row.title}</p>
        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
          #{row.huntId}
        </p>
      </td>
      <td className="py-3 pr-4">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[row.status]}`}
        >
          {STATUS_LABELS[row.status]}
        </span>
      </td>
      <td className="py-3 pr-4 text-right font-mono text-slate-700 dark:text-slate-200">
        {formatXlm(row.totalEscrowed)}
      </td>
      <td className="py-3 pr-4 text-right font-mono text-slate-700 dark:text-slate-200">
        {formatXlm(row.paid)}
      </td>
      <td className="py-3 pr-4 text-right font-mono text-slate-700 dark:text-slate-200">
        {formatXlm(row.remaining)}
      </td>
      <td className="py-3">
        <ReconcileBadge reconciled={row.reconciliation.reconciled} />
      </td>
    </tr>
  );
}

function TransactionsView({ rows }: { rows: PayoutRow[] }) {
  const all = useMemo(
    () =>
      rows.flatMap((row) =>
        row.transactions.map((tx) => ({ ...tx, huntTitle: row.title }))
      ),
    [rows]
  );

  if (all.length === 0) {
    return (
      <p className="rounded-lg bg-slate-50 py-8 text-center text-sm text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
        No transactions recorded.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {all.map((tx, index) => (
        <a
          key={`${tx.txHash}-${index}`}
          href={tx.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900/80"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {TX_LABELS[tx.type]}
              </span>
              <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                {tx.huntTitle}
              </span>
            </div>
            <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {shortenHash(tx.txHash)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
              {formatXlm(tx.amount)}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </a>
      ))}
    </div>
  );
}
