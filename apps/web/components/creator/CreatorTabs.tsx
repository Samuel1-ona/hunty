"use client";

export type CreatorTab = "active" | "archived" | "deleted";

interface CreatorTabsProps {
  activeTab: CreatorTab;
  activeCount: number;
  archivedCount: number;
  deletedCount: number;
  onChange: (tab: CreatorTab) => void;
}

export function CreatorTabs({
  activeTab,
  activeCount,
  archivedCount,
  deletedCount,
  onChange,
}: CreatorTabsProps) {
  return (
    <div className="mb-6 flex gap-2 border-b border-slate-200">
      {(
        [
          ["active", "Active", activeCount],
          ["archived", "Archived", archivedCount],
          ["deleted", "Trash", deletedCount],
        ] as const
      ).map(([tab, label, count]) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab
              ? "border-[#3737A4] text-[#3737A4]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          {label} ({count})
        </button>
      ))}
    </div>
  );
}
