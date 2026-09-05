"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  BulkActionsToolbar,
  ConfirmActionDialog,
  CreatorHuntList,
  CreatorPageHeader,
  CreatorTabs,
  type HuntAction,
  SaveAsTemplateDialog,
} from "@/components/creator";
import { Header } from "@/components/Header";
import { useWallet } from "@/lib/context/WalletContext";
import { promoteHunt } from "@/lib/contracts/rewardManager";
import {
  duplicateHunt,
  getArchivedHunts,
  getHuntsByCreator,
  getSoftDeletedHunts,
  hideHuntsFromPublic,
  permanentDeleteHunts,
  restoreHunts,
  softDeleteHunts,
  SPOTLIGHT_FEE_XLM,
  unhideHuntsFromPublic,
} from "@/lib/huntStore";
import { logger } from "@/lib/logger";
import { fetchCreatorRewardHistory } from "@/lib/rewardHistory";
import type { StoredHunt } from "@/lib/types";

const OnboardingTour = dynamic(() => import("@/components/OnboardingTour"), {
  ssr: false,
});

type Tab = "active" | "archived" | "deleted";

export default function CreatorPage() {
  const router = useRouter();
  const { connected, publicKey, connect } = useWallet();
  const [hunts, setHunts] = useState<StoredHunt[]>([]);
  const [archivedHunts, setArchivedHunts] = useState<StoredHunt[]>([]);
  const [softDeletedHunts, setSoftDeletedHunts] = useState<StoredHunt[]>([]);
  const [rewardHistory, setRewardHistory] = useState<
    Awaited<ReturnType<typeof fetchCreatorRewardHistory>>
  >([]);
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [selectedHunts, setSelectedHunts] = useState<number[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: HuntAction;
    huntIds: number[];
  }>({ open: false, action: "archive", huntIds: [] });
  const [promotingHuntId, setPromotingHuntId] = useState<number | null>(null);

  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; huntId: number | null }>({
    open: false,
    huntId: null,
  });

  const loadHunts = useCallback(() => {
    if (!publicKey) {
      setHunts([]);
      setArchivedHunts([]);
      setSoftDeletedHunts([]);
      return;
    }
    setHunts(getHuntsByCreator());
    setArchivedHunts(getArchivedHunts());
    setSoftDeletedHunts(getSoftDeletedHunts());
  }, [publicKey]);

  useEffect(() => {
    loadHunts();
  }, [loadHunts]);

  useEffect(() => {
    if (!publicKey) {
      setRewardHistory([]);
      return;
    }

    let cancelled = false;

    const loadRewardHistory = async () => {
      try {
        const data = await fetchCreatorRewardHistory(publicKey);
        if (!cancelled) setRewardHistory(data);
      } catch (err) {
        logger.error("Failed to load creator reward history:", err);
      }
    };

    loadRewardHistory();

    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  const handlePromote = async (huntId: number) => {
    try {
      setPromotingHuntId(huntId);
      const receipt = await promoteHunt(huntId, SPOTLIGHT_FEE_XLM);
      loadHunts();
      toast.success(
        `Spotlight active until ${new Date(receipt.promotedUntil * 1000).toLocaleString()}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to promote hunt.");
    } finally {
      setPromotingHuntId(null);
    }
  };

  const handleAction = (action: HuntAction, huntIds: number[]) => {
    setConfirmDialog({ open: true, action, huntIds });
  };

  const confirmAction = () => {
    const { action, huntIds } = confirmDialog;

    switch (action) {
      case "archive":
        hideHuntsFromPublic(huntIds);
        break;
      case "unarchive":
        unhideHuntsFromPublic(huntIds);
        break;
      case "soft-delete":
        softDeleteHunts(huntIds);
        break;
      case "restore":
        restoreHunts(huntIds);
        break;
      case "permanent-delete":
        permanentDeleteHunts(huntIds);
        break;
    }

    setConfirmDialog({ open: false, action: "archive", huntIds: [] });
    setSelectedHunts([]);
    loadHunts();
  };

  const toggleHuntSelection = (huntId: number) => {
    setSelectedHunts((prev) =>
      prev.includes(huntId) ? prev.filter((id) => id !== huntId) : [...prev, huntId]
    );
  };

  const getCurrentHunts = () => {
    switch (activeTab) {
      case "active":
        return hunts.filter((h) => !h.isArchived);
      case "archived":
        return archivedHunts;
      case "deleted":
        return softDeletedHunts;
      default:
        return hunts;
    }
  };

  const templateHunt =
    [...hunts, ...archivedHunts, ...softDeletedHunts].find(
      (h) => h.id === templateDialog.huntId
    ) ?? undefined;

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] pb-12">
      <OnboardingTour tourType="creator" />
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <CreatorPageHeader />

        {/* Tabs */}
        <CreatorTabs
          activeTab={activeTab}
          activeCount={hunts.filter((h) => !h.isArchived).length}
          archivedCount={archivedHunts.length}
          deletedCount={softDeletedHunts.length}
          onChange={(tab) => {
            setActiveTab(tab);
            setSelectedHunts([]);
          }}
        />

        {/* Bulk actions */}
        {selectedHunts.length > 0 && (
          <BulkActionsToolbar
            selectedHuntIds={selectedHunts}
            activeTab={activeTab}
            onAction={handleAction}
            onClear={() => setSelectedHunts([])}
          />
        )}

        <CreatorHuntList
          connected={connected}
          huntsCount={hunts.length}
          currentHunts={getCurrentHunts()}
          activeTab={activeTab}
          selectedHuntIds={selectedHunts}
          promotingHuntId={promotingHuntId}
          rewardHistory={rewardHistory}
          onConnect={connect}
          onSelect={toggleHuntSelection}
          onPromote={handlePromote}
          onDuplicate={(huntId) => {
            const newHunt = duplicateHunt(huntId);
            if (newHunt) {
              router.push(`/hunty?edit=${newHunt.id}`);
            }
          }}
          onSaveTemplate={(huntId) => setTemplateDialog({ open: true, huntId })}
          onAction={handleAction}
        />

        <ConfirmActionDialog
          open={confirmDialog.open}
          action={confirmDialog.action}
          huntCount={confirmDialog.huntIds.length}
          onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
          onConfirm={confirmAction}
        />

        <SaveAsTemplateDialog
          open={templateDialog.open}
          hunt={templateHunt}
          onOpenChange={(open) => setTemplateDialog({ open, huntId: null })}
        />
      </div>
    </div>
  );
}