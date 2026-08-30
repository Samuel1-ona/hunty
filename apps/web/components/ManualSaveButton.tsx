'use client';

import { useEffect, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { SaveStatus } from '@/hooks/useHuntDraftAutoSave';

interface ManualSaveButtonProps {
  /** Current lifecycle state reported by useHuntDraftAutoSave. */
  saveStatus: SaveStatus;
  /** Called when the user clicks the button — should call saveNow(). */
  onSave: () => Promise<void>;
  /** Optional additional className for layout positioning. */
  className?: string;
}

/**
 * ManualSaveButton
 *
 * A sticky "Save draft" button that:
 *  - Shows a spinner while saving.
 *  - Displays a transient ✓ / ✗ icon after the operation.
 *  - Fires a Sonner toast on success and on error.
 *
 * The button is disabled while a save is already in progress.
 */
export function ManualSaveButton({ saveStatus, onSave, className }: ManualSaveButtonProps) {
  const [localStatus, setLocalStatus] = useState<SaveStatus>(saveStatus);

  // Mirror the parent status so we can show a brief success icon before
  // reverting to idle.
  useEffect(() => {
    setLocalStatus(saveStatus);

    if (saveStatus === 'saved') {
      toast.success('Draft saved!', {
        description: 'Your progress has been saved to this device.',
        duration: 2_500,
      });
      // Revert to idle after the toast duration
      const t = setTimeout(() => setLocalStatus('idle'), 2_500);
      return () => clearTimeout(t);
    }

    if (saveStatus === 'error') {
      toast.error('Save failed', {
        description: 'Could not save your draft. Please try again.',
        duration: 4_000,
      });
    }
  }, [saveStatus]);

  const handleClick = async () => {
    if (localStatus === 'saving') return;
    setLocalStatus('saving');
    try {
      await onSave();
    } catch {
      setLocalStatus('error');
    }
  };

  const isDisabled = localStatus === 'saving';

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isDisabled}
      onClick={handleClick}
      aria-label={
        localStatus === 'saving'
          ? 'Saving draft…'
          : localStatus === 'saved'
            ? 'Draft saved'
            : 'Save draft'
      }
      aria-busy={localStatus === 'saving'}
      className={[
        'flex items-center gap-1.5 border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900',
        'dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-400 dark:hover:text-slate-100',
        'disabled:opacity-60 transition-colors',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <StatusIcon status={localStatus} />
      {statusLabel(localStatus)}
    </Button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: SaveStatus }) {
  switch (status) {
    case 'saving':
      return <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />;
    case 'saved':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />;
    case 'error':
      return <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-hidden />;
    default:
      return <Save className="h-3.5 w-3.5" aria-hidden />;
  }
}

function statusLabel(status: SaveStatus): string {
  switch (status) {
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Save failed';
    default:
      return 'Save draft';
  }
}
