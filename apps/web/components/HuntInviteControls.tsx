"use client";

import { Copy, Link2, RefreshCw, ShieldOff } from "lucide-react";
import { type MouseEvent as ReactMouseEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { buildHuntInviteUrl, generateHuntInvite, revokeHuntInvite } from "@/lib/huntStore";
import type { HuntInvite, StoredHunt } from "@/lib/types";

interface HuntInviteControlsProps {
  hunt: StoredHunt;
  onRefresh: () => void;
}

function stopCardNavigation(event: ReactMouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

async function copyInvite(huntId: number, invite: HuntInvite): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;

  try {
    const url = buildHuntInviteUrl(huntId, invite.token);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function HuntInviteControls({ hunt, onRefresh }: HuntInviteControlsProps) {
  const [renderedAt] = useState(Date.now);

  if (!hunt.is_private) return null;

  const inviteIsActive = Boolean(hunt.invite && hunt.invite.expiresAt > renderedAt);
  const inviteIsExpired = Boolean(hunt.invite && !inviteIsActive);

  const handleGenerate = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    stopCardNavigation(event);

    try {
      const invite = generateHuntInvite(hunt.id);
      onRefresh();

      if (await copyInvite(hunt.id, invite)) {
        toast.success("Invite link generated and copied to clipboard");
      } else {
        toast.success("Invite link generated. Use Copy invite link to share it.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate invite link");
    }
  };

  const handleCopy = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    stopCardNavigation(event);
    if (!hunt.invite || !inviteIsActive) return;

    if (await copyInvite(hunt.id, hunt.invite)) {
      toast.success("Invite link copied to clipboard");
    } else {
      toast.error("Failed to copy invite link");
    }
  };

  const handleRevoke = (event: ReactMouseEvent<HTMLButtonElement>) => {
    stopCardNavigation(event);

    if (!window.confirm("Revoke this invite link? Anyone using it will lose access.")) {
      return;
    }

    if (revokeHuntInvite(hunt.id)) {
      onRefresh();
      toast.success("Invite link revoked");
    } else {
      toast.error("No active invite link to revoke");
    }
  };

  return (
    <div
      className="mb-4 rounded-xl border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-800/50 dark:bg-violet-950/20"
      onClick={stopCardNavigation}
      aria-label={`Invite controls for ${hunt.title}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-800 dark:text-violet-300">
          <Link2 className="h-3.5 w-3.5" />
          Private invite
        </span>
        {inviteIsActive && hunt.invite ? (
          <span className="text-[11px] text-violet-600 dark:text-violet-400">
            Expires {new Date(hunt.invite.expiresAt).toLocaleDateString()}
          </span>
        ) : inviteIsExpired ? (
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
            Invite expired
          </span>
        ) : (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">No active link</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {inviteIsActive ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
              aria-label={`Copy invite link for ${hunt.title}`}
              className="border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy invite link
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRevoke}
              aria-label={`Revoke invite link for ${hunt.title}`}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Revoke
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            aria-label={`${inviteIsExpired ? "Generate new" : "Generate"} invite link for ${hunt.title}`}
            className="border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300"
          >
            {inviteIsExpired ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {inviteIsExpired ? "Generate new link" : "Generate invite link"}
          </Button>
        )}
      </div>
    </div>
  );
}
