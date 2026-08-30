'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EscrowDrawer } from '@/components/EscrowDrawer';
import { Header } from '@/components/Header';
import { HuntDashboard } from '@/components/HuntDashboard';
import { Button } from '@/components/ui/button';
import {
  buildHuntHistoryQuery,
  getHuntHistoryView,
  type HuntHistorySortOption,
  type HuntHistoryStatusFilter,
  parseHuntHistoryPage,
  parseHuntHistorySortOption,
  parseHuntHistoryStatusFilter,
} from '@/lib/huntHistory';
import {
  getCreatorHunts,
  getHuntById,
  restoreHuntStoreSnapshot,
  saveCluesLocallyBatch,
  takeHuntStoreSnapshot,
  updateHuntStatus,
} from '@/lib/huntStore';
import { syncCreatorHuntsWithModeration } from '@/lib/moderation/clientSync';
import { withTransactionToast } from '@/lib/txToast';
import type { StoredHunt } from '@/lib/types';
import dynamic from 'next/dynamic';

const RewardHistoryPanel = dynamic(() =>
  import('@/components/RewardHistoryPanel').then((mod) => mod.RewardHistoryPanel)
);

type SearchParamValue = string | string[] | undefined;

type DashboardPageClientProps = {
  searchParams?: Record<string, SearchParamValue>;
};

function readSearchParam(value?: SearchParamValue): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export function DashboardPageClient({ searchParams = {} }: DashboardPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hunts, setHunts] = useState<StoredHunt[]>([]);
  const [escrowDrawerOpen, setEscrowDrawerOpen] = useState(false);

  const refresh = useCallback(() => {
    setHunts(getCreatorHunts());
  }, []);

  useEffect(() => {
    refresh();
    const huntsList = getCreatorHunts();
    void syncCreatorHuntsWithModeration(huntsList).then(() => refresh());
  }, [refresh]);

  const statusFilter = parseHuntHistoryStatusFilter(readSearchParam(searchParams.status));
  const sortOption = parseHuntHistorySortOption(readSearchParam(searchParams.sort));
  const requestedPage = parseHuntHistoryPage(readSearchParam(searchParams.page));

  const historyView = useMemo(
    () =>
      getHuntHistoryView(hunts, {
        status: statusFilter,
        sort: sortOption,
        page: requestedPage,
      }),
    [hunts, requestedPage, sortOption, statusFilter]
  );

  const replaceHistoryQuery = useCallback(
    (nextState: {
      page?: number;
      sort?: HuntHistorySortOption;
      status?: HuntHistoryStatusFilter;
    }) => {
      const query = buildHuntHistoryQuery({
        status: nextState.status ?? statusFilter,
        sort: nextState.sort ?? sortOption,
        page: nextState.page ?? historyView.currentPage,
      });

      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [historyView.currentPage, pathname, router, sortOption, statusFilter]
  );

  useEffect(() => {
    const currentQuery = buildHuntHistoryQuery({
      status: statusFilter,
      sort: sortOption,
      page: requestedPage,
    });
    const normalizedQuery = buildHuntHistoryQuery({
      status: statusFilter,
      sort: sortOption,
      page: historyView.currentPage,
    });

    if (currentQuery !== normalizedQuery) {
      router.replace(normalizedQuery ? `${pathname}?${normalizedQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [historyView.currentPage, pathname, requestedPage, router, sortOption, statusFilter]);

  const handleActivate = useCallback(
    async (huntId: number) => {
      const hunt = getHuntById(huntId);
      if (!hunt) return;

      const snapshot = takeHuntStoreSnapshot();
      updateHuntStatus(huntId, 'PendingReview');
      refresh();

      try {
        const res = await fetch('/api/moderation/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hunt }),
        });
        if (!res.ok) {
          throw new Error('Moderation submit failed');
        }
        await withTransactionToast(async () => ({}), {
          pending: 'Submitting hunt for admin review…',
          approving: 'Submitting hunt for admin review…',
          confirmed: 'Submitted! You will be notified when moderation completes.',
        });
      } catch (error) {
        restoreHuntStoreSnapshot(snapshot);
        refresh();
        throw error;
      }
    },
    [refresh]
  );

  const handleSaveClues = useCallback(
    async (huntId: number, clues: { question: string; answer: string; points: number }[]) => {
      const snapshot = takeHuntStoreSnapshot();
      const normalizedClues = clues.map((clue) => ({
        huntId,
        question: clue.question.trim(),
        answer: clue.answer.trim().toLowerCase(),
        points: clue.points,
      }));

      try {
        saveCluesLocallyBatch(normalizedClues);
        refresh();

        await withTransactionToast(
          async (setStage) => {
            setStage('approving');
            const { addCluesBatch } = await import('@/lib/contracts/hunt');
            return addCluesBatch(
              huntId,
              normalizedClues.map(({ huntId: _huntId, ...clue }) => clue)
            );
          },
          {
            pending: `Pending â€” preparing ${normalizedClues.length} clue${normalizedClues.length === 1 ? '' : 's'}â€¦`,
            approving: 'Approving â€” sign in your walletâ€¦',
            confirmed: 'Clues confirmed!',
          }
        );
      } catch (error) {
        restoreHuntStoreSnapshot(snapshot);
        refresh();
        throw error;
      }
    },
    [refresh]
  );

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] pb-12">
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            asChild
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Game Arcade
            </Link>
          </Button>
        </div>

        <h1 className="mb-2 bg-linear-to-br from-[#3737A4] to-[#0C0C4F] bg-clip-text text-3xl font-bold text-transparent">
          My Hunts
        </h1>
        <p className="mb-8 text-slate-600">
          Activate a draft hunt so players can see it in the Game Arcade. Active hunts cannot be
          edited.
        </p>

        <RewardHistoryPanel hunts={hunts} onRefresh={refresh} />

        <div className="mb-4 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEscrowDrawerOpen(true)}
            className="flex items-center gap-2"
          >
            Escrows
          </Button>
        </div>

        <HuntDashboard
          hunts={historyView.pageHunts}
          totalHunts={historyView.totalHunts}
          filteredCount={historyView.filteredCount}
          currentPage={historyView.currentPage}
          totalPages={historyView.totalPages}
          pageSize={historyView.pageSize}
          startItem={historyView.startItem}
          endItem={historyView.endItem}
          statusFilter={statusFilter}
          sortOption={sortOption}
          onStatusFilterChange={(nextStatus) =>
            replaceHistoryQuery({ status: nextStatus, page: 1 })
          }
          onSortChange={(nextSort) => replaceHistoryQuery({ sort: nextSort, page: 1 })}
          onPageChange={(nextPage) => replaceHistoryQuery({ page: nextPage })}
          onActivate={handleActivate}
          onRefresh={refresh}
          onSaveClues={handleSaveClues}
        />
        <EscrowDrawer open={escrowDrawerOpen} onClose={() => setEscrowDrawerOpen(false)} />
      </div>
    </div>
  );
}
