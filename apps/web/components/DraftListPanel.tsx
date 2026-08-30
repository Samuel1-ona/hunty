'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Trash2, FileEdit, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import {
  listAllDrafts,
  deleteDraft,
  deleteDraftFromServer,
  fetchDraftsFromServer,
} from '@/hooks/useHuntDraftAutoSave';
import { useWallet } from '@/lib/context/WalletContext';
import type { HuntDraftSave } from '@/lib/types';

/** Merge local and server drafts, deduped by draftId (newest copy wins), newest first. */
function mergeDrafts(local: HuntDraftSave[], remote: HuntDraftSave[]): HuntDraftSave[] {
  const byId = new Map<string, HuntDraftSave>();
  for (const draft of [...local, ...remote]) {
    const existing = byId.get(draft.draftId);
    if (!existing || new Date(draft.savedAt) > new Date(existing.savedAt)) {
      byId.set(draft.draftId, draft);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

/**
 * DraftListPanel
 *
 * Renders the list of hunt draft auto-saves on the creator dashboard,
 * merging the local (offline-first) copy with the server copy for
 * connected wallets so drafts saved on another device also show up here.
 * Each row shows the label, save time, and quick actions:
 *  - Resume: opens /hunty with the draftId query param
 *  - Delete: removes the draft locally and (if synced) on the server
 *
 * Collapses to a summary when there are many drafts.
 */
export function DraftListPanel() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [drafts, setDrafts] = useState<HuntDraftSave[]>([]);
  const [expanded, setExpanded] = useState(false);

  const loadDrafts = async () => {
    const local = listAllDrafts();
    if (!publicKey) {
      setDrafts(local);
      return;
    }
    const remote = await fetchDraftsFromServer(publicKey);
    setDrafts(mergeDrafts(local, remote));
  };

  useEffect(() => {
    void loadDrafts();
  }, [publicKey]);

  if (drafts.length === 0) return null;

  const PREVIEW_COUNT = 3;
  const visibleDrafts = expanded ? drafts : drafts.slice(0, PREVIEW_COUNT);
  const hasMore = drafts.length > PREVIEW_COUNT;

  const handleResume = (draft: HuntDraftSave) => {
    router.push(`/hunty?draftId=${draft.draftId}`);
  };

  const handleDelete = (draftId: string) => {
    deleteDraft(draftId);
    if (publicKey) void deleteDraftFromServer(draftId);
    void loadDrafts();
  };

  return (
    <section aria-label="Auto-saved drafts" className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
          Auto-saved Drafts
        </h2>
        <span className="text-xs text-slate-500">
          {drafts.length} draft{drafts.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-3">
        {visibleDrafts.map((draft) => (
          <DraftCard
            key={draft.draftId}
            draft={draft}
            onResume={() => handleResume(draft)}
            onDelete={() => handleDelete(draft.draftId)}
          />
        ))}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 flex items-center gap-1 text-slate-500 hover:text-slate-700"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" aria-hidden />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden />
              Show {drafts.length - PREVIEW_COUNT} more
            </>
          )}
        </Button>
      )}
    </section>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface DraftCardProps {
  draft: HuntDraftSave;
  onResume: () => void;
  onDelete: () => void;
}

function DraftCard({ draft, onResume, onDelete }: DraftCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const huntCount = draft.hunts.length;
  const savedAgo = formatTimeAgo(draft.savedAt);

  return (
    <Card className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <CardTitle className="truncate text-base text-slate-800">{draft.label}</CardTitle>
        <CardDescription className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3 w-3 shrink-0" aria-hidden />
          <span>Saved {savedAgo}</span>
          <span aria-hidden>·</span>
          <span>
            {huntCount} clue card{huntCount === 1 ? '' : 's'}
          </span>
        </CardDescription>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          onClick={onResume}
          className="flex items-center gap-1.5 bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white"
          aria-label={`Resume draft "${draft.label}"`}
        >
          <FileEdit className="h-3.5 w-3.5" aria-hidden />
          Resume
        </Button>

        {confirmingDelete ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                onDelete();
                setConfirmingDelete(false);
              }}
              aria-label={`Confirm delete draft "${draft.label}"`}
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingDelete(false)}
              aria-label="Cancel delete"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete draft "${draft.label}"`}
            className="text-slate-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
    </Card>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
