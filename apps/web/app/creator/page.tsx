"use client";

import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  Copy,
  HelpCircle,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@hunty/ui";
import { Card, CardDescription, CardTitle } from "@hunty/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const OnboardingTour = dynamic(() => import("@/components/OnboardingTour"), {
  ssr: false,
})
import { Header } from "@/components/Header";
import { RewardHistorySection } from "@/components/RewardHistorySection";
import { DraftListPanel } from "@/components/DraftListPanel";
import { useWallet } from "@/lib/context/WalletContext";
import { promoteHunt } from "@/lib/contracts/rewardManager";
import {
  duplicateHunt,
  getArchivedHunts,
  getHuntsByCreator,
  getSoftDeletedHunts,
  hideHuntsFromPublic,
  isHuntPromoted,
  permanentDeleteHunts,
  restoreHunts,
  softDeleteHunts,
  SPOTLIGHT_FEE_XLM,
  unhideHuntsFromPublic,
} from "@/lib/huntStore";
import { saveHuntAsTemplate } from "@/lib/communityTemplates";
import { logger } from "@/lib/logger";
import { fetchCreatorRewardHistory } from "@/lib/rewardHistory";
import type { StoredHunt } from "@/lib/types";

function StatusBadge({ status }: { status: StoredHunt["status"] }) {
  const config: Partial<Record<StoredHunt["status"], string>> = {
    Draft: "bg-amber-100 text-amber-800 border-amber-200",
    Active: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Completed: "bg-slate-100 text-slate-700 border-slate-200",
    Cancelled: "bg-red-100 text-red-800 border-red-200",
  };
  const style = config[status] ?? config.Draft!;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}

export default function CreatorPage() {
  const router = useRouter();
  const { connected, publicKey, connect } = useWallet();
  const [hunts, setHunts] = useState<StoredHunt[]>([]);
  const [archivedHunts, setArchivedHunts] = useState<StoredHunt[]>([]);
  const [softDeletedHunts, setSoftDeletedHunts] = useState<StoredHunt[]>([]);
  const [rewardHistory, setRewardHistory] = useState<
    Awaited<ReturnType<typeof fetchCreatorRewardHistory>>
  >([]);
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "deleted">("active");
  const [selectedHunts, setSelectedHunts] = useState<number[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "archive" | "unarchive" | "soft-delete" | "restore" | "permanent-delete";
    huntIds: number[];
  }>({ open: false, action: "archive", huntIds: [] });
  const [promotingHuntId, setPromotingHuntId] = useState<number | null>(null);

  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; huntId: number | null }>({
    open: false,
    huntId: null,
  });
  const [templateAuthor, setTemplateAuthor] = useState("");

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

  const handleCardClick = (hunt: StoredHunt) => {
    if (hunt.status === "Draft") {
      router.push(`/hunty?edit=${hunt.id}`);
    } else if (hunt.status === "Active") {
      router.push(`/creator/stats/${hunt.id}`);
    }
    // Completed: no navigation or could open a read-only summary
  };

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

  const handleAction = (
    action: "archive" | "unarchive" | "soft-delete" | "restore" | "permanent-delete",
    huntIds: number[]
  ) => {
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

  const getActionMessage = () => {
    const { action, huntIds } = confirmDialog;
    const count = huntIds.length;

    switch (action) {
      case "archive":
        return `Archive ${count} hunt${count > 1 ? "s" : ""}? They will be hidden from the public but data will be preserved.`;
      case "unarchive":
        return `Unarchive ${count} hunt${count > 1 ? "s" : ""}? They will be visible to the public again.`;
      case "soft-delete":
        return `Soft delete ${count} hunt${count > 1 ? "s" : ""}? They will be moved to trash and can be restored within 30 days.`;
      case "restore":
        return `Restore ${count} hunt${count > 1 ? "s" : ""}? They will be moved back to your active hunts.`;
      case "permanent-delete":
        return `Permanently delete ${count} hunt${count > 1 ? "s" : ""}? This action cannot be undone and all data will be lost.`;
    }
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
              {getCurrentHunts().map((hunt) => {
                const isDraft = hunt.status === "Draft";
                const isActive = hunt.status === "Active";
                const isClickable = isDraft || isActive;
                const isSelected = selectedHunts.includes(hunt.id);
                const isPromoted = isHuntPromoted(hunt);

                return (
                  <Card
                    key={hunt.id}
                    className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow ${
                      isClickable ? "cursor-pointer hover:shadow-md" : "opacity-90"
                    } ${isSelected ? "ring-2 ring-[#3737A4]" : ""}`}
                  >
                    <div className="p-5">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleHuntSelection(hunt.id);
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
                              void handlePromote(hunt.id);
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
                                  const newHunt = duplicateHunt(hunt.id);
                                  if (newHunt) {
                                    router.push(`/hunty?edit=${newHunt.id}`);
                                  }
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
                                  setTemplateDialog({ open: true, huntId: hunt.id });
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
                                  handleAction("archive", [hunt.id]);
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
                                  handleAction("soft-delete", [hunt.id]);
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
                                  handleAction("unarchive", [hunt.id]);
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
                                  handleAction("soft-delete", [hunt.id]);
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
                                  handleAction("restore", [hunt.id]);
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
                                  handleAction("permanent-delete", [hunt.id]);
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
                            (hunt.deletedAt +
                              (hunt.recoveryWindow || 30 * 86400) -
                              Math.floor(Date.now() / 1000)) /
                              86400
                          )}{" "}
                          days
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
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

        {/* Confirmation Dialog */}
        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {confirmDialog.action === "permanent-delete" && (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                {confirmDialog.action === "archive" && (
                  <Archive className="h-5 w-5 text-slate-600" />
                )}
                {confirmDialog.action === "unarchive" && (
                  <RefreshCw className="h-5 w-5 text-slate-600" />
                )}
                {confirmDialog.action === "soft-delete" && (
                  <Trash2 className="h-5 w-5 text-orange-600" />
                )}
                {confirmDialog.action === "restore" && (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                )}
                {confirmDialog.action.charAt(0).toUpperCase() +
                  confirmDialog.action.slice(1).replace("-", " ")}
              </AlertDialogTitle>
              <AlertDialogDescription>{getActionMessage()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmAction}
                className={
                  confirmDialog.action === "permanent-delete" ||
                  confirmDialog.action === "soft-delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#3737A4] hover:bg-slate-800"
                }
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save as Template Dialog */}
        <AlertDialog
          open={templateDialog.open}
          onOpenChange={(open) => setTemplateDialog({ ...templateDialog, open })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-600" />
                Save as Template
              </AlertDialogTitle>
              <AlertDialogDescription>
                Save this hunt&apos;s structure as a template. The clues will be saved but the answers will be removed, allowing others to create new hunts from your design.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Author Name
              </label>
              <Input
                value={templateAuthor}
                onChange={(e) => setTemplateAuthor(e.target.value)}
                placeholder="Your Name or Studio"
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!templateAuthor.trim()) {
                    toast.error("Author name is required.");
                    return;
                  }
                  if (templateDialog.huntId) {
                    try {
                        const hunt = [...hunts, ...archivedHunts, ...softDeletedHunts].find((h) => h.id === templateDialog.huntId);
                        if (hunt) {
                            saveHuntAsTemplate(hunt, templateAuthor);
                            toast.success("Saved as template. It is now available in the Template Gallery.");
                        }
                    } catch (err: any) {
                        toast.error(err.message || "Failed to save template.");
                    }
                  }
                  setTemplateDialog({ open: false, huntId: null });
                  setTemplateAuthor("");
                }}
                disabled={!templateAuthor.trim()}
                className="bg-[#3737A4] hover:bg-slate-800"
              >
                Save Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
 