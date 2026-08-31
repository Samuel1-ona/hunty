import { type MouseEvent as ReactMouseEvent, useState } from "react";
import { toast } from "sonner";

import { archiveHunts, deleteHunts, duplicateHunt } from "@/lib/huntStore";
import type { ClueRow, StoredHunt } from "@/lib/types";

interface UseDashboardStateOptions {
  hunts: StoredHunt[];
  onActivate: (huntId: number) => Promise<void>;
  onRefresh: () => void;
  onSaveClues: (huntId: number, clues: ClueRow[]) => Promise<void>;
}

export function useDashboardState({
  hunts,
  onActivate,
  onRefresh,
  onSaveClues,
}: UseDashboardStateOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modalHunt, setModalHunt] = useState<StoredHunt | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [clueModalHunt, setClueModalHunt] = useState<StoredHunt | null>(null);
  const [leaderboardHunt, setLeaderboardHunt] = useState<StoredHunt | null>(null);
  const [clueRows, setClueRows] = useState<ClueRow[]>([
    { id: 1, question: "", answer: "", points: 10 },
  ]);
  const [poolHuntId, setPoolHuntId] = useState<number | null>(null);
  const [isSavingClues, setIsSavingClues] = useState(false);
  const [activeTab, setActiveTab] = useState<"hunts" | "analytics">("hunts");

  const visibleHuntIds = hunts.map((hunt) => hunt.id);
  const selectedVisibleCount = visibleHuntIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = hunts.length > 0 && selectedVisibleCount === hunts.length;

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      visibleHuntIds.forEach((id) => next.delete(id));
    } else {
      visibleHuntIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} hunts?`)) {
      deleteHunts(Array.from(selectedIds));
      setSelectedIds(new Set());
      onRefresh();
      toast.success("Hunts deleted successfully");
    }
  };

  const handleBatchArchive = () => {
    if (selectedIds.size === 0) return;
    archiveHunts(Array.from(selectedIds));
    setSelectedIds(new Set());
    onRefresh();
    toast.success("Hunts archived successfully");
  };

  const handleCopyId = (event: ReactMouseEvent<HTMLElement>, id: number) => {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard.writeText(id.toString());
    toast.success("Copied Hunt ID to clipboard!");
  };

  const handleDuplicate = (event: ReactMouseEvent<HTMLElement>, hunt: StoredHunt) => {
    event.preventDefault();
    event.stopPropagation();
    const duplicated = duplicateHunt(hunt.id);
    if (duplicated) {
      toast.success(`"${duplicated.title}" created`);
      onRefresh();
    } else {
      toast.error("Failed to duplicate hunt");
    }
  };

  const handleActivateClick = (hunt: StoredHunt) => setModalHunt(hunt);

  const handleConfirmActivate = async () => {
    if (!modalHunt) return;
    setActivatingId(modalHunt.id);
    try {
      await onActivate(modalHunt.id);
      onRefresh();
      setModalHunt(null);
    } finally {
      setActivatingId(null);
    }
  };

  const openClueModal = (hunt: StoredHunt) => {
    setClueRows([{ id: 1, question: "", answer: "", points: 10 }]);
    setClueModalHunt(hunt);
  };

  const addClueRow = () => {
    const newId = clueRows.length > 0 ? Math.max(...clueRows.map((row) => row.id)) + 1 : 1;
    setClueRows([...clueRows, { id: newId, question: "", answer: "", points: 10 }]);
  };

  const removeClueRow = (id: number) => {
    if (clueRows.length > 1) {
      setClueRows(clueRows.filter((row) => row.id !== id));
    }
  };

  const updateClueRow = (id: number, field: keyof Omit<ClueRow, "id">, value: string | number) => {
    setClueRows(clueRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleSaveClues = async () => {
    if (!clueModalHunt) return;
    const validRows = clueRows.filter((row) => row.question.trim() && row.answer.trim());
    if (!validRows.length) return;

    setIsSavingClues(true);
    try {
      await onSaveClues(clueModalHunt.id, validRows);
      onRefresh();
      setClueModalHunt(null);
    } finally {
      setIsSavingClues(false);
    }
  };

  return {
    // Tab
    activeTab,
    setActiveTab,
    // Selection
    selectedIds,
    allVisibleSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection: () => setSelectedIds(new Set()),
    // Batch actions
    handleBatchDelete,
    handleBatchArchive,
    // Per-card actions
    handleCopyId,
    handleDuplicate,
    handleActivateClick,
    // Activate modal
    modalHunt,
    activatingId,
    setModalHunt,
    handleConfirmActivate,
    // Clue modal
    clueModalHunt,
    setClueModalHunt,
    clueRows,
    isSavingClues,
    openClueModal,
    addClueRow,
    removeClueRow,
    updateClueRow,
    handleSaveClues,
    // Reward pool
    poolHuntId,
    setPoolHuntId,
    // Leaderboard dialog
    leaderboardHunt,
    setLeaderboardHunt,
  };
}
