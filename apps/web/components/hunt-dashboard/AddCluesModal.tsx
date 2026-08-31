import { Button } from "@hunty/ui";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ClueRow, StoredHunt } from "@/lib/types";

interface AddCluesModalProps {
  hunt: StoredHunt | null;
  clueRows: ClueRow[];
  isSaving: boolean;
  onAddRow: () => void;
  onRemoveRow: (id: number) => void;
  onUpdateRow: (id: number, field: keyof Omit<ClueRow, "id">, value: string | number) => void;
  onSave: () => void;
  onClose: () => void;
}

export function AddCluesModal({
  hunt,
  clueRows,
  isSaving,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onSave,
  onClose,
}: AddCluesModalProps) {
  const a11y = useTranslations("a11y");

  const cluesAreValid = clueRows.some((row) => row.question.trim() && row.answer.trim());

  return (
    <Dialog open={!!hunt} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-2xl font-bold text-transparent">
            Add Clues - {hunt?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-[1fr_1fr_56px_32px] gap-2 px-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Riddle / Question
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Answer</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Points</span>
            <span />
          </div>

          {clueRows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_56px_32px] items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-4 shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {index + 1}.
                </span>
                <Input
                  placeholder="e.g. What has keys but no locks?"
                  value={row.question}
                  onChange={(event) => onUpdateRow(row.id, "question", event.target.value)}
                  className="py-2 pl-3 text-sm"
                />
              </div>
              <Input
                placeholder="Answer (e.g. keyboard|laptop)"
                value={row.answer}
                onChange={(event) => onUpdateRow(row.id, "answer", event.target.value)}
                className="py-2 pl-3 text-sm"
              />
              <Input
                type="number"
                placeholder="10"
                value={row.points}
                min={1}
                onChange={(event) =>
                  onUpdateRow(row.id, "points", parseInt(event.target.value, 10) || 0)
                }
                className="py-2 pl-3 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemoveRow(row.id)}
                aria-label={a11y("removeClueRow", { row: index + 1 })}
                disabled={clueRows.length === 1}
                className="text-red-400 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            onClick={onAddRow}
            className="flex items-center gap-1 border-[#3737A4] text-[#3737A4] hover:bg-[#3737A4] hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving || !cluesAreValid}
              className="bg-gradient-to-b from-[#39A437] to-[#194F0C] text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Clues"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
