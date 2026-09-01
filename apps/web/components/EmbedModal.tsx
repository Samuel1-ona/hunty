"use client";

import { useState } from "react";
import { Code2, Copy, Check, ExternalLink, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { StoredHunt } from "@/lib/types";

interface EmbedModalProps {
  hunt: StoredHunt;
  open: boolean;
  onClose: () => void;
}

function buildEmbedSnippet(huntId: number, baseUrl: string): string {
  return `<iframe
  src="${baseUrl}/hunt/${huntId}/embed"
  width="360"
  height="480"
  frameborder="0"
  style="border-radius:12px;border:1px solid #e2e8f0;max-width:100%;"
  title="Hunty – Hunt #${huntId}"
  loading="lazy"
  allowtransparency="true"
></iframe>`;
}

export function EmbedModal({ hunt, open, onClose }: EmbedModalProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BASE_URL ?? "https://hunty.app");

  const snippet = buildEmbedSnippet(hunt.id, baseUrl);
  const previewUrl = `${baseUrl}/hunt/${hunt.id}/embed`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the textarea text
      const el = document.getElementById("embed-snippet") as HTMLTextAreaElement | null;
      el?.select();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton
        className="sm:max-w-lg rounded-2xl border border-slate-200 bg-white dark:bg-[#0f0e1a] dark:border-white/10"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#0C0C4F] dark:text-slate-100">
            <Code2 className="w-5 h-5 shrink-0 text-[#3737A4] dark:text-indigo-400" />
            Embed &ldquo;{hunt.title}&rdquo;
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
            Paste this snippet into any webpage, Discord widget, or blog post to show a live hunt card.
          </DialogDescription>
        </DialogHeader>

        {/* Privacy warning */}
        {hunt.is_private && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              This hunt is <strong>private</strong>. The embedded widget will show a &ldquo;private hunt&rdquo; message to viewers.
              Make the hunt public if you want the widget to display its details.
            </span>
          </div>
        )}

        {/* Code block */}
        <div className="relative rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 overflow-hidden">
          <textarea
            id="embed-snippet"
            readOnly
            value={snippet}
            rows={7}
            className="w-full resize-none bg-transparent px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 outline-none leading-relaxed"
            aria-label="Embed code snippet"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            size="sm"
            onClick={handleCopy}
            className="absolute top-2 right-2 h-7 px-2.5 gap-1.5 bg-[#3737A4] hover:bg-[#2e2e8a] text-white text-xs font-semibold shadow-sm"
            aria-label="Copy embed code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>

        {/* Preview hint */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            The widget shows the hunt title, reward type, clue count, and a live Play CTA. It updates automatically.
          </p>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3737A4] dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview widget
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
