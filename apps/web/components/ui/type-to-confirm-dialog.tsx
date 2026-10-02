"use client";

import { AlertTriangle } from "lucide-react";
import * as React from "react";

import { Button } from "@hunty/ui";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TypeToConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  huntTitle: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function TypeToConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  huntTitle,
  onConfirm,
  loading = false,
}: TypeToConfirmDialogProps) {
  const [typedText, setTypedText] = React.useState("");

  const isMatch = typedText === huntTitle;

  const handleConfirm = () => {
    onConfirm();
    setTypedText("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTypedText("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-red-900/30 bg-[#110e0e] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-zinc-300 text-sm leading-relaxed">
            You are about to permanently delete{" "}
            <span className="font-semibold text-white">&quot;{huntTitle}&quot;</span>.
            This action cannot be undone.
          </p>
          <p className="text-zinc-300 text-sm leading-relaxed">
            To confirm, type the hunt name below:
          </p>
          <Input
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder={`Type "${huntTitle}" to confirm`}
            disabled={loading}
            className="bg-red-950/40 border-red-800/40 text-white placeholder:text-red-300/50"
            autoFocus
          />
          <DialogFooter className="max-sm:flex-col max-sm:gap-2">
            <DialogClose asChild>
              <Button
                variant="outline"
                disabled={loading}
                className="border-white/10 text-zinc-300 hover:bg-white/5"
              >
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!isMatch || loading}
            >
              {loading ? "Deleting..." : confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
