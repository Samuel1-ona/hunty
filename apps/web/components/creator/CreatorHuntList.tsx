"use client";

import { Button } from "@hunty/ui";
import { Card } from "@hunty/ui";
import Link from "next/link";

import { DraftListPanel } from "@/components/DraftListPanel";
import { RewardHistorySection } from "@/components/RewardHistorySection";
import type { StoredHunt } from "@/lib/types";

import type { CreatorTab } from "./CreatorTabs";
import { type HuntAction,HuntCard } from "./HuntCard";

interface CreatorHuntListProps {
  connected: boolean;
  huntsCount: number;
  currentHunts: StoredHunt[];
  activeTab: CreatorTab;
  selectedHuntIds: number[];
  promotingHuntId: number | null;
  rewardHistory: Awaited<ReturnType<typeof import("@/lib/rewardHistory").fetchCreatorRewardHistory>>;
  onConnect: () => void;
  onSelect: (huntId: number) => void;
  onPromote: (huntId: number) => void;
  onDuplicate: (huntId: number) => void;
  onSaveTemplate: (huntId: number) => void;
  onAction: (action: HuntAction, huntIds: number[]) => void;
}

export function CreatorHuntList({
  connected,
  huntsCount,
  currentHunts,
  activeTab,
  selectedHuntIds,
  promotingHuntId,
  rewardHistory,
  onConnect,
  onSelect,
  onPromote,
  onDuplicate,
  onSaveTemplate,
  onAction,
}: CreatorHuntListProps) {
  if (!connected) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="mb-4 text-slate-600">
          Connect your wallet to see hunts you have created.
        </p>
        <Button onClick={onConnect} className="bg-[#0C0C4F] hover:bg-slate-800 text-white">
          Connect Wallet
        </Button>
      </Card>
    );
  }

  if (huntsCount === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currentHunts.map((hunt) => (
          <HuntCard
            key={hunt.id}
            hunt={hunt}
            activeTab={activeTab}
            isSelected={selectedHuntIds.includes(hunt.id)}
            promotingHuntId={promotingHuntId}
            onSelect={onSelect}
            onPromote={onPromote}
            onDuplicate={onDuplicate}
            onSaveTemplate={onSaveTemplate}
            onAction={onAction}
          />
        ))}
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
  );
}
