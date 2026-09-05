import type { StoredHunt } from "@/lib/types";

export function StatusBadge({ status }: { status: StoredHunt["status"] }) {
  const config: Partial<Record<StoredHunt["status"], string>> = {
    Draft: "bg-amber-100 text-amber-800 border-amber-200",
    Active: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Completed: "bg-slate-100 text-slate-700 border-slate-200",
    Cancelled: "bg-red-100 text-red-800 border-red-200",
  };
  const style = config[status] ?? config.Draft!;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}
