"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ActivateHuntModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  huntTitle: string
  isActivating?: boolean
}

export function ActivateHuntModal({
  isOpen,
  onClose,
  onConfirm,
  huntTitle,
  isActivating = false,
}: ActivateHuntModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="font-bold bg-gradient-to-b from-[#2D4FEB] to-[#0C0C4F] text-transparent bg-clip-text mb-4 text-center text-2xl">
            Activate this hunt?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300 text-lg">
            Once activated, <strong>an active hunt cannot be edited.</strong> Players will be able to
            participate and it will appear in the public Game Arcade.
          </p>
          {huntTitle && (
            <p className="text-slate-500 dark:text-slate-400 text-sm italic">
              Hunt: &quot;{huntTitle}&quot;
            </p>
          )}
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
              onClick={onConfirm}
              className="flex-1 bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 text-white"
              disabled={isActivating}
            >
              {isActivating ? "Activating…" : "Activate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
