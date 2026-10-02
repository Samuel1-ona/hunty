"use client";

import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
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

interface ExtendEndTimeDialogProps {
  extendEndTimeDialog: {
    open: boolean;
    huntId: number | null;
    currentEndTime?: number;
  };
  onOpenChange: (open: boolean) => void;
  onExtend: (huntId: number, newEndTime: number) => void;
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

export function ExtendEndTimeDialog({ extendEndTimeDialog, onOpenChange, onExtend }: ExtendEndTimeDialogProps) {
  const [newEndTime, setNewEndTime] = useState<string>("");

  const handleExtend = () => {
    if (extendEndTimeDialog.huntId && newEndTime) {
      const timestamp = Math.floor(new Date(newEndTime).getTime() / 1000);
      onExtend(extendEndTimeDialog.huntId, timestamp);
      setNewEndTime("");
    }
  };

  const currentEndTimeStr = extendEndTimeDialog.currentEndTime
    ? new Date(extendEndTimeDialog.currentEndTime * 1000).toISOString().slice(0, 16)
    : "";

  return (
    <AlertDialog open={extendEndTimeDialog.open} onOpenChange={(open) => onOpenChange({ ...extendEndTimeDialog, open })}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Extend Hunt End Time</AlertDialogTitle>
          <AlertDialogDescription>
            Choose a new end time for this hunt. The current end time is:{" "}
            {currentEndTimeStr ? new Date(extendEndTimeDialog.currentEndTime! * 1000).toLocaleString() : "Not set"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <label htmlFor="new-end-time" className="text-sm font-medium text-slate-700 block mb-2">
            New End Time
          </label>
          <Input
            id="new-end-time"
            type="datetime-local"
            value={newEndTime}
            onChange={(e) => setNewEndTime(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setNewEndTime("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleExtend} disabled={!newEndTime}>
            Extend Time
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
