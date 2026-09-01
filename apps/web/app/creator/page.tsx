"use client";

import { Archive, ArrowLeft, HelpCircle, RefreshCw, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Button } from "@hunty/ui";
import { Card } from "@hunty/ui";
import { Header } from "@/components/Header";
import { RewardHistorySection } from "@/components/RewardHistorySection";
import { DraftListPanel } from "@/components/DraftListPanel";
import { ConfirmationDialog, SaveTemplateDialog } from "./_components/creator-dialogs";
import { HuntList } from "./_components/hunt-list";
import { useCreatorPage } from "./_hooks/use-creator-page";

const OnboardingTour = dynamic(() => import("@/components/OnboardingTour"), {
  ssr: false,
});

export default function CreatorPage() {
  const {
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
  } = useCreatorPage();

  const activeHunts = hunts.filter((h) => !h.isArchived);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] pb-12">
      <OnboardingTour tourType="creator" />
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            asChild
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Game Arcade
            </Link>
          </Button>
        </div>

        <h1 className="mb-2 text-3xl font-bold bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text flex items-center gap-3">
          My Hunts
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-semibold text-[#3737A4] dark:text-indigo-400 hover:underline gap-1.5 flex items-center p-1 h-auto"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("start-onboarding-tour", { detail: { tourType: "creator" } })
              )
            }
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Take Tour
          </Button>
        </h1>
        <p className="mb-6 text-slate-600">
          View and manage hunts you have created. Draft hunts open in Edit; Active hunts open Live
          Statistics.
        </p>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab("active");
              setSelectedHunts([]);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "active"
                ? "border-[#3737A4] text-[#3737A4]"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Active ({hunts.filter((h) => !h.isArchived).length})
          </button>
          <button
            onClick={() => {
              setActiveTab("archived");
              setSelectedHunts([]);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "archived"
                ? "border-[#3737A4] text-[#3737A4]"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Archived ({archivedHunts.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("deleted");
              setSelectedHunts([]);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "deleted"
                ? "border-[#3737A4] text-[#3737A4]"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Trash ({softDeletedHunts.length})
          </button>
        </div>

        {/* Bulk actions */}
        {selectedHunts.length > 0 && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-sm text-slate-600">{selectedHunts.length} selected</span>
            {activeTab === "active" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("archive", selectedHunts)}
                  className="gap-1"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("soft-delete", selectedHunts)}
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
                  onClick={() => handleAction("unarchive", selectedHunts)}
                  className="gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Unarchive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("soft-delete", selectedHunts)}
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
                  onClick={() => handleAction("restore", selectedHunts)}
                  className="gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("permanent-delete", selectedHunts)}
                  className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Permanent Delete
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelectedHunts([])}>
              Clear selection
            </Button>
          </div>
        )}

        {!connected ? (
          <Card className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="mb-4 text-slate-600">
              Connect your wallet to see hunts you have created.
            </p>
            <Button
              onClick={() => connect()}
              className="bg-[#0C0C4F] hover:bg-slate-800 text-white"
            >
              Connect Wallet
            </Button>
          </Card>
        ) : hunts.length === 0 ? (
          <Card className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="mb-4 text-slate-600">You haven&apos;t created any hunts yet.</p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                id="creator-create-button"
                asChild
                className="bg-[#0C0C4F] hover:bg-slate-800 text-white"
              >
                <Link href="/hunty">Create your first hunt</Link>
              </Button>
              <Button
                id="creator-templates-button"
                asChild
                variant="outline"
                className="border-[#0C0C4F] text-[#0C0C4F] hover:bg-[#0C0C4F] hover:text-white"
              >
                <Link href="/hunty/templates">Browse templates</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <HuntList
                hunts={getCurrentHunts()}
                activeTab={activeTab}
                selectedHunts={selectedHunts}
                promotingHuntId={promotingHuntId}
                onToggleSelect={toggleHuntSelection}
                onAction={handleAction}
                onPromote={handlePromote}
                onSaveTemplate={(hunt) => setTemplateDialog({ open: true, huntId: hunt.id })}
              />
            </div>

            <div id="reward-history-section" className="mt-10">
              <RewardHistorySection
                title="Reward Distribution"
                description="All rewards you distributed across your created hunts, with explorer links and filters."
                entries={rewardHistory}
                showRecipient
                recipientLabel="Recipient"
              />
            </div>

            <DraftListPanel />
          </>
        )}

        <ConfirmationDialog
          confirmDialog={confirmDialog}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
          onConfirm={confirmAction}
        />

        <SaveTemplateDialog
          templateDialog={templateDialog}
          templateAuthor={templateAuthor}
          onOpenChange={(open) => setTemplateDialog({ ...templateDialog, open })}
          onAuthorChange={setTemplateAuthor}
          onSave={handleSaveTemplate}
        />
      </div>
    </div>
  );
}
 