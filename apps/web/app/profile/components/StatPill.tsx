"use client";

export function StatPill({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/70 border border-slate-200 px-4 py-3 flex flex-col gap-1 shadow-sm">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`text-xl font-semibold text-slate-900 ${valueClassName ?? ""}`}>
        {value}
      </span>
    </div>
  );
}
