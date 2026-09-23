"use client"

import { Button } from "@hunty/ui"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export interface ConfirmDialogState {
  open: boolean
  action?: string
  count?: number
}

export interface TemplateDialogState {
  open: boolean
  huntId?: number
}

export function ConfirmationDialog({
  confirmDialog,
  onOpenChange,
  onConfirm,
}: {
  confirmDialog: ConfirmDialogState
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={confirmDialog.open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm hunt action</DialogTitle>
          <DialogDescription>
            {confirmDialog.count ?? 0} hunt(s) will be {confirmDialog.action ?? "updated"}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button label="Cancel" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button label="Confirm" onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SaveTemplateDialog({
  templateDialog,
  templateAuthor,
  onOpenChange,
  onAuthorChange,
  onSave,
}: {
  templateDialog: TemplateDialogState
  templateAuthor: string
  onOpenChange: (open: boolean) => void
  onAuthorChange: (author: string) => void
  onSave: () => void
}) {
  return (
    <Dialog open={templateDialog.open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save hunt as template</DialogTitle>
          <DialogDescription>Choose the author name shown on the community template.</DialogDescription>
        </DialogHeader>
        <Input aria-label="Template author" value={templateAuthor} onChange={(event) => onAuthorChange(event.target.value)} placeholder="Author name" />
        <DialogFooter>
          <Button label="Cancel" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button label="Save template" onClick={onSave}>Save template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
