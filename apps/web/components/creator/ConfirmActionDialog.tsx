"use client";

import { AlertTriangle, Archive, CheckCircle, RefreshCw, Trash2 } from "lucide-react";

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

import type { HuntAction } from "./types";

interface ConfirmActionDialogProps {
  open: boolean;
  action: HuntAction;
  huntCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function getActionMessage(action: HuntAction, count: number): string {
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
}

export function ConfirmActionDialog({
  open,
  action,
  huntCount,
  onOpenChange,
  onConfirm,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {action === "permanent-delete" && <AlertTriangle className="h-5 w-5 text-red-600" />}
            {action === "archive" && <Archive className="h-5 w-5 text-slate-600" />}
            {action === "unarchive" && <RefreshCw className="h-5 w-5 text-slate-600" />}
            {action === "soft-delete" && <Trash2 className="h-5 w-5 text-orange-600" />}
            {action === "restore" && <CheckCircle className="h-5 w-5 text-emerald-600" />}
            {action.charAt(0).toUpperCase() + action.slice(1).replace("-", " ")}
          </AlertDialogTitle>
          <AlertDialogDescription>{getActionMessage(action, huntCount)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              action === "permanent-delete" || action === "soft-delete"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#3737A4] hover:bg-slate-800"
            }
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
