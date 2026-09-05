"use client";

import { Button } from "@hunty/ui";
import { Card, CardDescription, CardTitle } from "@hunty/ui";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Copy,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { isHuntPromoted, SPOTLIGHT_FEE_XLM } from "@/lib/huntStore";
import type { StoredHunt } from "@/lib/types";

import { StatusBadge } from "./StatusBadge";

export type HuntTab = "active" | "archived" | "deleted";

interface HuntCardProps {
  hunt: StoredHunt;
  activeTab: HuntTab;
  isSelected: boolean;
  promotingHuntId: number | null;
  onSelect: (huntId: number) => void;
  onPromote: (huntId: number) => void;
  onDuplicate: (huntId: number) => void;
  onSaveTemplate: (huntId: number) => void;
  onAction: (action: "archive" | "unarchive" | "soft-delete" | "restore" | "permanent-delete", huntIds: number[]) => void;
}

export function HuntCard({
  hunt,
  activeTab,
  isSelected,
  promotingHuntId,
  onSelect,
  onPromote,
  onDuplicate,
  onSaveTemplate,
  onAction,
}: HuntCardProps) {
  const isDraft = hunt.status === "Draft";
  const isActive = hunt.status === "Active";
  const isClickable = isDraft || isActive;
  const isPromoted = isHuntPromoted(hunt);
  // Current unix time in seconds, captured once per render so the expiry
  // countdown stays a pure function of render inputs (react-hooks/purity).
  const [expiryNow] = useState(() => Math.floor(Date.now() / 1000));

  return (
    <Card
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow ${
        isClickable ? "cursor-pointer hover:shadow-md" : "opacity-90"
      } ${isSelected ? "ring-2 ring-[#3737A4]" : ""}`}
    >
      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={`Select ${hunt.title}`}
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(hunt.id);
              }}
              className="w-4 h-4 rounded border-slate-300 text-[#3737A4] focus:ring-[#3737A4]"
            />
            <CardTitle className="line-clamp-2 text-lg">{hunt.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isPromoted ? (
              <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-700">
                Promoted
              </span>
            ) : null}
            <StatusBadge status={hunt.status} />
          </div>
        </div>
        <CardDescription className="mb-4 line-clamp-3 text-sm text-slate-600">
          {hunt.description}
        </CardDescription>
        {isActive && (
          <div className="mb-3">
            <Button
              type="button"
              size="sm"
              variant={isPromoted ? "outline" : "primary"}
              onClick={(event) => {
                event.stopPropagation();
                onPromote(hunt.id);
              }}
              disabled={promotingHuntId === hunt.id}
            >
              {promotingHuntId === hunt.id
                ? "Promoting..."
                : isPromoted
                  ? "Extend Spotlight"
                  : `Promote (${SPOTLIGHT_FEE_XLM} XLM)`}
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {hunt.cluesCount} {hunt.cluesCount === 1 ? "clue" : "clues"}
          </span>
          <div className="flex items-center gap-1">
            {isDraft && (
              <span className="flex items-center gap-1 text-xs text-amber-700">
                <Pencil className="h-3 w-3" />
                Edit
              </span>
            )}
            {isActive && (
              <span className="flex items-center gap-1 text-xs text-emerald-700">
                <BarChart3 className="h-3 w-3" />
                Live Statistics
              </span>
            )}
            {/* Individual action buttons */}
            {activeTab === "active" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(hunt.id);
                  }}
                  className="h-6 w-6 p-0 text-slate-500 hover:text-indigo-600"
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveTemplate(hunt.id);
                  }}
                  className="h-6 w-6 p-0 text-slate-500 hover:text-orange-600"
                  title="Save as Template"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("archive", [hunt.id]);
                  }}
                  className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("soft-delete", [hunt.id]);
                  }}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {activeTab === "archived" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("unarchive", [hunt.id]);
                  }}
                  className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                  title="Unarchive"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("soft-delete", [hunt.id]);
                  }}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {activeTab === "deleted" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("restore", [hunt.id]);
                  }}
                  className="h-6 w-6 p-0 text-emerald-500 hover:text-emerald-700"
                  title="Restore"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("permanent-delete", [hunt.id]);
                  }}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  title="Permanent Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {hunt.deletedAt && (
          <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expires in{" "}
            {Math.ceil(
              (hunt.deletedAt + (hunt.recoveryWindow || 30 * 86400) - expiryNow) / 86400
            )}{" "}
            days
          </div>
        )}
      </div>
    </Card>
  );
}
