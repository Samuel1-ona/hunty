"use client";

import { useCallback, useState } from "react";
import { Download, FileJson, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface LeaderboardExportProps {
  huntId: number;
}

type Format = "csv" | "json";

export function LeaderboardExport({ huntId }: LeaderboardExportProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState<Format | null>(null);

  const buildUrl = useCallback(
    (format: Format) => {
      const params = new URLSearchParams({ format });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return `/api/v1/hunts/${huntId}/leaderboard/export?${params.toString()}`;
    },
    [huntId, from, to]
  );

  const download = useCallback(
    async (format: Format) => {
      setDownloading(format);
      try {
        const res = await fetch(buildUrl(format), { method: "GET" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Export failed");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/)?.[1]
          ?? `hunt-${huntId}-leaderboard.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Leaderboard exported as ${format.toUpperCase()}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export failed");
      } finally {
        setDownloading(null);
      }
    },
    [buildUrl, huntId]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Export leaderboard data</h3>
        <p className="text-sm text-slate-600">
          Download ranks, wallets, scores, and completion timestamps. Filter by date range (optional).
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">From (optional)</span>
          <Input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Start date"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">To (optional)</span>
          <Input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="End date"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="default"
          onClick={() => download("csv")}
          disabled={downloading !== null}
        >
          {downloading === "csv" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>Export CSV</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => download("json")}
          disabled={downloading !== null}
        >
          {downloading === "json" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileJson className="h-4 w-4" />
          )}
          <span>Export JSON</span>
        </Button>
      </div>
    </div>
  );
}