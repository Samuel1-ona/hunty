"use client";

import { Download, FileJson, Upload } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@hunty/ui";
import {
  collectImageReferences,
  downloadHuntJson,
  parseHuntTransferFile,
  type HuntTransfer,
  type HuntTransferInput,
} from "@/lib/huntTransfer";

interface HuntTransferControlsProps {
  hunt: HuntTransferInput["hunt"];
  clues: HuntTransferInput["clues"];
  settings?: HuntTransferInput["settings"];
  onImport?: (transfer: HuntTransfer) => void;
}

export function HuntTransferControls({
  hunt,
  clues,
  settings,
  onImport,
}: HuntTransferControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  const handleExport = () => {
    try {
      downloadHuntJson({ hunt, clues, settings });
      setStatus("Hunt JSON downloaded.");
      toast.success("Hunt backup downloaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to export hunt.";
      setStatus(message);
      toast.error(message);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStatus("Validating hunt backup…");
    try {
      const transfer = await parseHuntTransferFile(file);
      const imageCount = collectImageReferences(transfer).length;
      onImport?.(transfer);
      setStatus(
        `Imported ${transfer.clues.length} clue${transfer.clues.length === 1 ? "" : "s"} with ${imageCount} image reference${imageCount === 1 ? "" : "s"}.`
      );
      toast.success("Hunt backup imported.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import hunt.";
      setStatus(message);
      toast.error(message);
    }
  };

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50"
      aria-labelledby="hunt-transfer-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="hunt-transfer-title"
            className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            <FileJson className="h-4 w-4 text-sky-600" aria-hidden="true" />
            Backup and sharing
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Export a versioned JSON copy with clues, settings, and image references.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={clues.length === 0}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Import JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="Import hunt JSON backup"
            onChange={(event) => void handleFileChange(event)}
          />
        </div>
      </div>
      {status && (
        <p
          className="mt-3 text-xs text-slate-600 dark:text-slate-300"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      )}
    </section>
  );
}
