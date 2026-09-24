"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { StoredHunt } from "@/lib/types";

interface ConfirmationDialogProps {
  confirmDialog: {
    open: boolean;
    title: string;
    message: string;
    action: string;
    huntIds: number[];
  };
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

interface SaveTemplateDialogProps {
  templateDialog: {
    open: boolean;
    huntId: number | null;
  };
  templateAuthor: string;
  onOpenChange: (open: boolean) => void;
  onAuthorChange: (author: string) => void;
  onSave: (hunt: StoredHunt) => void;
}

export function ConfirmationDialog({ confirmDialog, onOpenChange, onConfirm }: ConfirmationDialogProps) {
  return (
    <AlertDialog open={confirmDialog.open} onOpenChange={(open) => onOpenChange({ ...confirmDialog, open })}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDialog.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SaveTemplateDialog({ templateDialog, templateAuthor, onOpenChange, onAuthorChange, onSave }: SaveTemplateDialogProps) {
  return null;
}
