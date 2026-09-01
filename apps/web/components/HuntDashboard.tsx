"use client";

import { BarChart3, List } from "lucide-react";

import { ActivateHuntModal } from "@/components/ActivateHuntModal";
import { CreatorAnalytics } from "@/components/CreatorAnalytics";
import { RewardPoolManager } from "@/components/RewardPoolManager";
import { type HuntHistorySortOption, type HuntHistoryStatusFilter } from "@/lib/huntHistory";
import type { ClueRow, StoredHunt } from "@/lib/types";
import { cn } from "@/lib/utils";

import { AddCluesModal } from "./hunt-dashboard/AddCluesModal";
import { HuntCardGrid } from "./hunt-dashboard/HuntCardGrid";
import { HuntFilterBar } from "./hunt-dashboard/HuntFilterBar";
import { HuntPagination } from "./hunt-dashboard/HuntPagination";
import { LeaderboardDialog } from "./hunt-dashboard/LeaderboardDialog";
import { useDashboardState } from "./hunt-dashboard/useDashboardState";

interface HuntDashboardProps {
  hunts: StoredHunt[];
  totalHunts: number;
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  startItem: number;
  endItem: number;
  statusFilter: HuntHistoryStatusFilter;
  sortOption: HuntHistorySortOption;
  onStatusFilterChange: (status: HuntHistoryStatusFilter) => void;
  onSortChange: (sort: HuntHistorySortOption) => void;
  onPageChange: (page: number) => void;
  onActivate: (huntId: number) => Promise<void>;
  onRefresh: () => void;
  onSaveClues: (huntId: number, clues: ClueRow[]) => Promise<void>;
}

export function HuntDashboard({
  hunts,
  totalHunts,
  filteredCount,
  currentPage,
  totalPages,
  pageSize,
  startItem,
  endItem,
  statusFilter,
  sortOption,
  onStatusFilterChange,
  onSortChange,
  onPageChange,
  onActivate,
  onRefresh,
  onSaveClues,
}: HuntDashboardProps) {
  const {
    activeTab,
    setActiveTab,
    selectedIds,
    allVisibleSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    handleBatchDelete,
    handleBatchArchive,
    handleCopyId,
    handleDuplicate,
    handleActivateClick,
    modalHunt,
    activatingId,
    setModalHunt,
    handleConfirmActivate,
    clueModalHunt,
    setClueModalHunt,
    clueRows,
    isSavingClues,
    openClueModal,
    addClueRow,
    removeClueRow,
    updateClueRow,
    handleSaveClues,
    poolHuntId,
    setPoolHuntId,
    leaderboardHunt,
    setLeaderboardHunt,
  } = useDashboardState({ hunts, onActivate, onRefresh, onSaveClues });

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/60 w-fit">
        <button
          onClick={() => setActiveTab("hunts")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
            activeTab === "hunts"
              ? "bg-[#3737A4] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <List className="w-4 h-4" />
          My Hunts
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
            activeTab === "analytics"
              ? "bg-[#3737A4] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {activeTab === "analytics" ? (
        <CreatorAnalytics hunts={hunts} />
      ) : (
        <>
          <HuntFilterBar
            totalHunts={totalHunts}
            filteredCount={filteredCount}
            currentPage={currentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            statusFilter={statusFilter}
            sortOption={sortOption}
            allVisibleSelected={allVisibleSelected}
            selectedCount={selectedIds.size}
            onStatusFilterChange={onStatusFilterChange}
            onSortChange={onSortChange}
            onToggleSelectAll={toggleSelectAll}
            onBatchArchive={handleBatchArchive}
            onBatchDelete={handleBatchDelete}
            onClearSelection={clearSelection}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <HuntCardGrid
              hunts={hunts}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onCopyId={handleCopyId}
              onDuplicate={handleDuplicate}
              onOpenClueModal={openClueModal}
              onActivateClick={handleActivateClick}
              onRefresh={onRefresh}
            />
          </div>

          <HuntPagination
            currentPage={currentPage}
            totalPages={totalPages}
            filteredCount={filteredCount}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        </>
      )}

      <ActivateHuntModal
        isOpen={!!modalHunt}
        onClose={() => setModalHunt(null)}
        onConfirm={handleConfirmActivate}
        huntTitle={modalHunt?.title ?? ""}
        isActivating={activatingId !== null}
      />

      <LeaderboardDialog hunt={leaderboardHunt} onClose={() => setLeaderboardHunt(null)} />

      <AddCluesModal
        hunt={clueModalHunt}
        clueRows={clueRows}
        isSaving={isSavingClues}
        onAddRow={addClueRow}
        onRemoveRow={removeClueRow}
        onUpdateRow={updateClueRow}
        onSave={handleSaveClues}
        onClose={() => setClueModalHunt(null)}
      />

      {poolHuntId !== null && (
        <RewardPoolManager
          huntId={poolHuntId}
          isOpen={poolHuntId !== null}
          onClose={() => setPoolHuntId(null)}
        />
      )}
    </>
  );
}
