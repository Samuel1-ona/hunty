"use client";

import { useState, useCallback } from "react";

import type { StoredHunt } from "@/lib/types";
import {
  getCreatorHunts,
  getArchivedHunts,
  getSoftDeletedHunts,
  getHunt,
} from "@/lib/huntStore";

type ActiveTab = "active" | "archived" | "deleted" | "audit";

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  action: string;
  huntIds: number[];
}

interface TemplateDialogState {
  open: boolean;
  huntId: number | null;
}

interface UseCreatorPageReturn {
  connected: boolean;
  connect: () => void;
  hunts: StoredHunt[];
  archivedHunts: StoredHunt[];
  softDeletedHunts: StoredHunt[];
  rewardHistory: unknown[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedHunts: number[];
  setSelectedHunts: (ids: number[]) => void;
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: (dialog: ConfirmDialogState) => void;
  templateDialog: TemplateDialogState;
  setTemplateDialog: (dialog: TemplateDialogState) => void;
  templateAuthor: string;
  setTemplateAuthor: (author: string) => void;
  promotingHuntId: number | null;
  handlePromote: (huntId: number) => void;
  handleAction: (action: string, huntIds: number[]) => void;
  confirmAction: () => void;
  toggleHuntSelection: (huntId: number) => void;
  getCurrentHunts: () => StoredHunt[];
  handleSaveTemplate: (hunt: StoredHunt) => void;
  auditLog: unknown[];
  fetchAuditLog: (huntId: number) => Promise<void>;
  selectedAuditHuntId: number | null;
}

export function useCreatorPage(): UseCreatorPageReturn {
  const [connected, setConnected] = useState(false);
  const [hunts, setHunts] = useState<StoredHunt[]>([]);
  const [archivedHunts, setArchivedHunts] = useState<StoredHunt[]>([]);
  const [softDeletedHunts, setSoftDeletedHunts] = useState<StoredHunt[]>([]);
  const [rewardHistory, setRewardHistory] = useState<unknown[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");
  const [selectedHunts, setSelectedHunts] = useState<number[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    action: "",
    huntIds: [],
  });
  const [templateDialog, setTemplateDialog] = useState<TemplateDialogState>({
    open: false,
    huntId: null,
  });
  const [templateAuthor, setTemplateAuthor] = useState("");
  const [promotingHuntId, setPromotingHuntId] = useState<number | null>(null);
  const [auditLog, setAuditLog] = useState<unknown[]>([]);
  const [selectedAuditHuntId, setSelectedAuditHuntId] = useState<number | null>(null);

  const connect = useCallback(() => {
    setConnected(true);
    setHunts(getCreatorHunts());
    setArchivedHunts(getArchivedHunts());
    setSoftDeletedHunts(getSoftDeletedHunts());
  }, []);

  const handleAction = useCallback(
    (action: string, huntIds: number[]) => {
      setConfirmDialog({
        open: true,
        title: `${action} hunt${huntIds.length > 1 ? "s" : ""}`,
        message: `Are you sure you want to ${action} the selected hunt${huntIds.length > 1 ? "s" : ""}?`,
        action,
        huntIds,
      });
    },
    [],
  );

  const confirmAction = useCallback(() => {
    const { action, huntIds } = confirmDialog;
    if (action === "archive") {
      const { hideHuntsFromPublic } = require("@/lib/huntStore");
      hideHuntsFromPublic(huntIds);
    } else if (action === "soft-delete") {
      const { softDeleteHunts } = require("@/lib/huntStore");
      softDeleteHunts(huntIds);
    } else if (action === "restore") {
      const { restoreHunts } = require("@/lib/huntStore");
      restoreHunts(huntIds);
    } else if (action === "unarchive") {
      const { unhideHuntsFromPublic } = require("@/lib/huntStore");
      unhideHuntsFromPublic(huntIds);
    } else if (action === "permanent-delete") {
      const { permanentDeleteHunts } = require("@/lib/huntStore");
      permanentDeleteHunts(huntIds);
    }
    setConfirmDialog((prev) => ({ ...prev, open: false }));
    setSelectedHunts([]);
    // Refresh lists
    setHunts(getCreatorHunts());
    setArchivedHunts(getArchivedHunts());
    setSoftDeletedHunts(getSoftDeletedHunts());
  }, [confirmDialog]);

  const toggleHuntSelection = useCallback((huntId: number) => {
    setSelectedHunts((prev) =>
      prev.includes(huntId) ? prev.filter((id) => id !== huntId) : [...prev, huntId],
    );
  }, []);

  const handlePromote = useCallback((huntId: number) => {
    setPromotingHuntId(huntId);
  }, []);

  const handleSaveTemplate = useCallback((hunt: StoredHunt) => {
    setTemplateDialog({ open: true, huntId: hunt.id });
  }, []);

  const getCurrentHunts = useCallback(() => {
    if (activeTab === "archived") return archivedHunts;
    if (activeTab === "deleted") return softDeletedHunts;
    return hunts.filter((h) => !h.isArchived);
  }, [hunts, archivedHunts, softDeletedHunts, activeTab]);

  const fetchAuditLog = useCallback(async (huntId: number) => {
    setSelectedAuditHuntId(huntId);
    try {
      const res = await fetch(`/api/v1/hunts/${huntId}/audit`);
      if (res.ok) {
        const data = await res.json();
        setAuditLog(data.data ?? []);
      }
    } catch {
      setAuditLog([]);
    }
  }, []);

  return {
    connected,
    connect,
    hunts,
    archivedHunts,
    softDeletedHunts,
    rewardHistory,
    activeTab,
    setActiveTab,
    selectedHunts,
    setSelectedHunts,
    confirmDialog,
    setConfirmDialog,
    templateDialog,
    setTemplateDialog,
    templateAuthor,
    setTemplateAuthor,
    promotingHuntId,
    handlePromote,
    handleAction,
    confirmAction,
    toggleHuntSelection,
    getCurrentHunts,
    handleSaveTemplate,
    auditLog,
    fetchAuditLog,
    selectedAuditHuntId,
  };
}
