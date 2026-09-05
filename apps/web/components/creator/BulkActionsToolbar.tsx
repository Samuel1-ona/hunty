"use client";

import { Button } from "@hunty/ui";
import { Archive, RefreshCw, Trash2 } from "lucide-react";

import type { CreatorTab } from "./CreatorTabs";
import type { HuntAction } from "./types";

interface BulkActionsToolbarProps {
  selectedHuntIds: number[];
  activeTab: CreatorTab;
  onAction: (action: HuntAction, huntIds: number[]) => void;
  onClear: () => void;
}

export function BulkActionsToolbar({
  selectedHuntIds,
  activeTab,
  onAction,
  onClear,
}: BulkActionsToolbarProps) {
  return (
    <div className="mb-4 flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
      <span className="text-sm text-slate-600">{selectedHuntIds.length} selected</span>
      {activeTab === "active" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction("archive", selectedHuntIds)}
            className="gap-1"
          >
            <Archive className="w-4 h-4" />
            Archive
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction("soft-delete", selectedHuntIds)}
            className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </>
      )}
      {activeTab === "archived" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction("unarchive", selectedHuntIds)}
            className="gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Unarchive
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction("soft-delete", selectedHuntIds)}
            className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </>
      )}
      {activeTab === "deleted" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction("restore", selectedHuntIds)}
            className="gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Restore
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction("permanent-delete", selectedHuntIds)}
            className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Permanent Delete
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear selection
      </Button>
    </div>
  );
}
