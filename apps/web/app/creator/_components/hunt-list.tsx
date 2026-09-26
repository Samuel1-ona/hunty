"use client";

import { Archive, ArrowLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { StoredHunt } from "@/lib/types";

interface HuntListProps {
  hunts: StoredHunt[];
  activeTab: string;
  selectedHunts: number[];
  promotingHuntId: number | null;
  onToggleSelect: (huntId: number) => void;
  onAction: (action: string, huntIds: number[]) => void;
  onPromote: (huntId: number) => void;
  onSaveTemplate: (hunt: StoredHunt) => void;
  onViewAudit?: (huntId: number) => void;
}

export function HuntList({
  hunts,
  activeTab,
  selectedHunts,
  promotingHuntId,
  onToggleSelect,
  onAction,
  onPromote,
  onSaveTemplate,
  onViewAudit,
}: HuntListProps) {
  if (hunts.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">No hunts to display.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {hunts.map((hunt) => (
        <Card
          key={hunt.id}
          className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedHunts.includes(hunt.id)}
              onCheckedChange={() => onToggleSelect(hunt.id)}
              className="h-4 w-4"
            />
            <div className="flex-1 min-w-0">
              <Link
                href={`/creator/stats/${hunt.id}`}
                className="font-semibold text-slate-900 hover:text-[#3737A4] truncate block"
              >
                {hunt.title}
              </Link>
              <p className="text-sm text-slate-500 truncate">
                {hunt.description}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span>ID: {hunt.id}</span>
                <span>Status: {hunt.status}</span>
                {hunt.rewardPool && <span>Reward: {hunt.rewardPool} XLM</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onViewAudit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewAudit(hunt.id)}
                  className="text-xs text-slate-600 hover:text-[#3737A4]"
                  title="View audit log"
                >
                  Audit
                </Button>
              )}
              {activeTab === "active" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPromote(hunt.id)}
                    className="text-xs text-slate-600 hover:text-[#3737A4]"
                    disabled={promotingHuntId === hunt.id}
                  >
                    Promote
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSaveTemplate(hunt)}
                    className="text-xs text-slate-600 hover:text-[#3737A4]"
                  >
                    Template
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
