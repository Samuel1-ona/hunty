"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { saveHuntAsTemplate } from "@/lib/communityTemplates";
import type { StoredHunt } from "@/lib/types";

interface SaveAsTemplateDialogProps {
  open: boolean;
  /** The hunt to save; `undefined` when no hunt is selected. */
  hunt: StoredHunt | undefined;
  onOpenChange: (open: boolean) => void;
}

export function SaveAsTemplateDialog({ open, hunt, onOpenChange }: SaveAsTemplateDialogProps) {
  const [templateAuthor, setTemplateAuthor] = useState("");

  const handleSave = () => {
    if (!templateAuthor.trim()) {
      toast.error("Author name is required.");
      return;
    }
    if (hunt) {
      try {
        saveHuntAsTemplate(hunt, templateAuthor);
        toast.success("Saved as template. It is now available in the Template Gallery.");
      } catch (err) {
        toast.error((err as Error).message || "Failed to save template.");
      }
    }
    onOpenChange(false);
    setTemplateAuthor("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-600" />
            Save as Template
          </AlertDialogTitle>
          <AlertDialogDescription>
            Save this hunt&apos;s structure as a template. The clues will be saved but the answers
            will be removed, allowing others to create new hunts from your design.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Author Name</label>
          <Input
            value={templateAuthor}
            onChange={(e) => setTemplateAuthor(e.target.value)}
            placeholder="Your Name or Studio"
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSave}
            disabled={!templateAuthor.trim()}
            className="bg-[#3737A4] hover:bg-slate-800"
          >
            Save Template
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
