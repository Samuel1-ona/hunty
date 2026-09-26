"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";

import { AchievementShowcase } from "@/components/AchievementShowcase";
import { HuntCompletionTimeline } from "@/components/HuntCompletionTimeline";
import { ProfileHighlightBadge, ProfileStatsDashboard } from "@/components/ProfileStatsDashboard";
import { Button } from "@hunty/ui";
import { Card } from "@hunty/ui";
import { WalletAddress } from "@/components/WalletAddress";
import { WalletIdenticon } from "@/components/WalletIdenticon";
import { usePlayerProfileStats } from "@/hooks/usePlayerProfileStats";
import { shortenAddress } from "@/lib/context/WalletContext";

interface PlayerProfileViewProps {
  /** Stellar address whose profile is being viewed. Empty = no player. */
  address: string;
  /** True when the viewer is looking at their own connected wallet. */
  isOwnProfile?: boolean;
}

/**
 * Public, wallet-independent hunter profile.
 *
 * Renders the identity header, the aggregated statistics dashboard and the
 * hunt completion timeline for any Stellar address. It never requires a
 * connected wallet, so it backs both `/profile` (own profile) and
 * `/profile/[address]` (public profile view).
 */
export function PlayerProfileView({ address, isOwnProfile = false }: PlayerProfileViewProps) {
  const { stats, timeline, isLoading, error } = usePlayerProfileStats(address);

  const hasAddress = Boolean(address);

  return (
    <>
      {/* ── Identity header ─────────────────────────────────────────────── */}
      <Card className="mb-8 flex flex-col gap-4 border border-slate-200 bg-white/70 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {hasAddress ? (
            <WalletIdenticon address={address} size={48} className="shrink-0" />
          ) : (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-sm font-semibold text-white">
              HP
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-500">
              {isOwnProfile ? "Your profile" : "Hunter profile"}
            </span>
            {hasAddress ? (
              <WalletAddress
                address={address}
                showIdenticon={false}
                addressClassName="text-slate-800"
              />
            ) : (
              <span className="font-mono text-sm text-slate-800">No wallet connected</span>
            )}
          </div>
        </div>

        {hasAddress && <ProfileHighlightBadge stats={stats} />}
      </Card>

      {/* ── Wallet-less hint (public view still renders below) ──────────── */}
      {!hasAddress && (
        <div
          data-testid="profile-connect-hint"
          className="mb-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-8 text-center"
        >
          <Wallet className="h-6 w-6 text-slate-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-800">
            Connect your wallet to track your own stats
          </h2>
          <p className="max-w-md text-sm text-slate-600">
            Hunter profiles are public — you can browse any player&apos;s stats from a hunt
            leaderboard without connecting a wallet.
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/leaderboard">Browse the leaderboard</Link>
          </Button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {hasAddress && (
        <AchievementShowcase
          playerAddress={address}
          stats={{
            totalHuntsCompleted: stats.totalHuntsCompleted,
            totalHuntsWon: stats.firstPlaceFinishes,
            totalNftsEarned: stats.nftsWon,
          }}
          isOwnProfile={isOwnProfile}
        />
      )}

      {/* ── Aggregated statistics ───────────────────────────────────────── */}
      <section aria-label="Player statistics" className="mb-10">
        <div className="mb-4">
          <h2 className="bg-linear-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-xl font-bold text-transparent md:text-2xl">
            Statistics
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Aggregated from on-chain hunt leaderboard data
          </p>
        </div>

        <ProfileStatsDashboard stats={stats} isLoading={isLoading && hasAddress} />
      </section>

      {/* ── Completion timeline ─────────────────────────────────────────── */}
      <section aria-label="Hunt completion timeline" className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="bg-linear-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-xl font-bold text-transparent md:text-2xl">
              Hunt Timeline
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Completed hunts, newest first — jump to any leaderboard entry
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
            {stats.totalHuntsCompleted} completed
          </span>
        </div>

        <HuntCompletionTimeline
          completions={timeline}
          isLoading={isLoading && hasAddress}
          emptyMessage={
            hasAddress
              ? isOwnProfile
                ? "You haven't completed any hunts yet. Finish a hunt to start building your timeline."
                : "This hunter hasn't completed any hunts yet."
              : "Connect a wallet or open a hunter's profile to see their completed hunts."
          }
        />
      </section>
    </>
  );
}

/** Shared page heading used by the profile routes. */
export function ProfilePageHeading({
  title,
  subtitle,
  address,
}: {
  title: string;
  subtitle: string;
  address?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="bg-linear-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-600 md:text-base">
        {subtitle}
        {address && (
          <span className="ml-1 font-mono text-slate-700">{shortenAddress(address)}</span>
        )}
      </p>
    </div>
  );
}
