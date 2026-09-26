import { LeaderboardTable } from "@/components/LeaderBoardTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StoredHunt } from "@/lib/types";

interface LeaderboardDialogProps {
  hunt: StoredHunt | null;
  onClose: () => void;
}

export function LeaderboardDialog({ hunt, onClose }: LeaderboardDialogProps) {
  return (
    <Dialog open={!!hunt} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton className="bg-[#f9f9ff] sm:max-w-2xl dark:bg-slate-950">
        <DialogHeader className="mb-4">
          <DialogTitle className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-center text-2xl font-bold text-transparent">
            Leaderboard - {hunt?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-inner dark:border-white/5 dark:bg-slate-900">
          {hunt && <LeaderboardTable huntId={hunt.id} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
