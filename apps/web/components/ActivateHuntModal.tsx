"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ActivateHuntModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reactionsEnabled?: boolean) => void
  huntTitle: string
  isActivating?: boolean
  defaultReactionsEnabled?: boolean
}

export function ActivateHuntModal({
  isOpen,
  onClose,
  onConfirm,
  huntTitle,
  isActivating = false,
  defaultReactionsEnabled = true,
}: ActivateHuntModalProps) {
  const [reactionsEnabled, setReactionsEnabled] = useState(defaultReactionsEnabled)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="font-bold bg-gradient-to-b from-[#2D4FEB] to-[#0C0C4F] text-transparent bg-clip-text mb-4 text-center text-2xl">
            Submit for moderation?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300 text-lg">
            Your hunt will be sent to the admin moderation queue. Once approved, it will appear in the
            public Game Arcade and players can participate.
          </p>
          {huntTitle && (
            <p className="text-slate-500 dark:text-slate-400 text-sm italic">
              Hunt: &quot;{huntTitle}&quot;
            </p>
          )}
          <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-left cursor-pointer">
            <span className="text-sm text-slate-700 dark:text-slate-200">
              Enable live reactions
            </span>
            <input
              type="checkbox"
              checked={reactionsEnabled}
              onChange={(e) => setReactionsEnabled(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Players can react to hunts in real time. Reaction content is moderated through the existing queue.
          </p>
          <div className="flex gap-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isActivating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(reactionsEnabled)}
              className="flex-1 bg-gradient-to-b from-[[39A437] to-[#194F0C] hover:bg-green-700 text-white"
              disabled={isActivating}
            >
              {isActivating ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
