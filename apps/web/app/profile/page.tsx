"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AchievementShowcase } from "@/components/AchievementShowcase";
import { Header } from "@/components/Header";
import { LevelBadge, LevelProgress } from "@/components/LevelBadge";
import { ProfilePageSkeleton } from "@/components/LoadingSkeletons";
import type { NftRewardDetail } from "@/components/NftDetailModal";
import { NftGallery } from "@/components/NftGallery";
import { RewardHistorySection } from "@/components/RewardHistorySection";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFavorites } from "@/hooks/useFavorites";
import { usePlayerProfileStats } from "@/hooks/usePlayerProfileStats";
import { shortenAddress, WalletContext } from "@/lib/context/WalletContext";
import { getAllHunts } from "@/lib/huntStore";
import { getPlayerAttempts } from "@/lib/huntAttemptHistory";
import { logger } from "@/lib/logger";
import { getReferralStats } from "@/lib/referrals";
import { fetchPlayerRewardHistory } from "@/lib/rewardHistory";
import type { HuntAttemptRecord, ReferralStats, StoredHunt } from "@/lib/types";

import { StatPill } from "./components/StatPill";
import { RegistrationCard } from "./components/RegistrationCard";
import {
  fetchPlayerHunts,
  fetchPlayerRegistrations,
  fetchPlayerRewards,
} from "./fetchers";
import type { PlayerHuntProgress, RegisteredHunt } from "./types";

type NftReward = NftRewardDetail;

export default function UserProfilePage() {
  const wallet = useContext(WalletContext);
  const connected = wallet?.connected ?? false;
  const publicKey = wallet?.publicKey ?? "";

  const [hunts, setHunts] = useState<PlayerHuntProgress[]>([]);
  const [nftRewards, setNftRewards] = useState<NftReward[]>([]);
  const [rewardHistory, setRewardHistory] = useState<
    Awaited<ReturnType<typeof fetchPlayerRewardHistory>>
  >([]);
  const [registrations, setRegistrations] = useState<RegisteredHunt[]>([]);
  const [attemptHistory, setAttemptHistory] = useState<HuntAttemptRecord[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [savedHunts, setSavedHunts] = useState<StoredHunt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { favorites, isLoaded: isFavoritesLoaded } = useFavorites();
  const { stats: profileStats } = usePlayerProfileStats(publicKey);

  useEffect(() => {
    if (!connected || !publicKey) {
      setHunts([]);
      setNftRewards([]);
      setRegistrations([]);
      setAttemptHistory([]);
      setReferralStats(null);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) return;

    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchPlayerHunts(publicKey);
        if (!cancelled) setHunts(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile data.");
        }
      }
    };

    const loadRewards = async () => {
      try {
        const rewardsData = await fetchPlayerRewards(publicKey);
        if (!cancelled) setNftRewards(rewardsData);
      } catch (err) {
        logger.error("Failed to load NFT rewards:", err);
      }
    };

    const loadRegistrations = async () => {
      try {
        const data = await fetchPlayerRegistrations(publicKey);
        if (!cancelled) setRegistrations(data);
      } catch (err) {
        logger.error("Failed to load registrations:", err);
      }
    };

    const loadRewardHistory = async () => {
      try {
        const data = await fetchPlayerRewardHistory(publicKey);
        if (!cancelled) setRewardHistory(data);
      } catch (err) {
        logger.error("Failed to load reward history:", err);
      }
    };

    const run = async () => {
      setIsLoading(true);
      setError(null);
      setAttemptHistory(getPlayerAttempts(publicKey));
      setReferralStats(
        getReferralStats(
          publicKey,
          typeof window !== "undefined" ? window.location.origin : undefined
        )
      );
      await Promise.all([load(), loadRewards(), loadRegistrations(), loadRewardHistory()]);
      if (!cancelled) setIsLoading(false);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [connected, publicKey]);

  useEffect(() => {
    if (isFavoritesLoaded && typeof window !== "undefined") {
      const allHunts = getAllHunts();
      setSavedHunts(allHunts.filter((h) => favorites.includes(h.id)));
    }
  }, [favorites, isFavoritesLoaded]);

  const summary = useMemo(() => {
    const completedHunts = hunts.filter((h) => h.status === "Completed").length;
    const inProgressHunts = hunts.filter((h) => h.status === "In-Progress").length;
    const totalPoints = hunts.reduce((sum, h) => sum + h.pointsEarned, 0);
    const totalHunts = hunts.length;
    const completionRate =
      totalHunts === 0 ? 0 : Math.round((completedHunts / totalHunts) * 100);

    return {
      totalHunts,
      completedHunts,
      inProgressHunts,
      totalPoints,
      completionRate,
      totalNftRewards: nftRewards.length,
      claimedNftRewards: nftRewards.filter((nft) => nft.claimed).length,
      unclaimedNftRewards: nftRewards.filter((nft) => !nft.claimed).length,
    };
  }, [hunts, nftRewards]);

  const completedHunts = hunts.filter((h) => h.status === "Completed");
  const inProgressHunts = hunts.filter((h) => h.status === "In-Progress");
  const displayAddress = publicKey ? shortenAddress(publicKey) : "Not connected";

  return (
    <div className="min-h-screen bg-linear-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] pb-20">
      <Header />

      <div className="max-w-[1500px] mx-auto px-6 sm:px-10 pt-4 pb-12 bg-white rounded-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
              Player Profile
            </h1>
            <p className="text-sm md:text-base text-slate-600 mt-2">
              View your hunt history, progress, and total points earned.
            </p>
          </div>

          <Card className="border border-slate-200 bg-white/70 shadow-sm px-4 py-3 flex flex-col gap-1 max-w-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Connected Wallet</div>
            <div className="font-mono text-sm text-slate-800 break-all">{displayAddress}</div>
          </Card>
        </div>

        {!connected || !publicKey ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center px-6">
            <h2 className="text-xl md:text-2xl font-semibold text-slate-800 mb-2">
              Connect your wallet to see your history
            </h2>
            <p className="text-sm text-slate-600 mb-4 max-w-md">
              Your profile uses the connected Stellar address to load hunts you&apos;ve played and
              aggregate your points across games.
            </p>
            <p className="text-xs text-slate-500">
              Use the <span className="font-semibold">Connect Wallet</span> button in the header to
              get started.
            </p>
          </div>
        ) : isLoading ? (
          <ProfilePageSkeleton />
        ) : (
          <>
            {error ? (
              <p className="mb-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <section aria-label="Player level" className="mt-6">
              <Card className="bg-[#ececfa] border border-white/40 shadow-md">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg md:text-xl font-semibold text-slate-900">
                      Player Level
                    </CardTitle>
                    <CardDescription>Earn XP from completing hunts and level up!</CardDescription>
                  </div>
                  <LevelBadge playerAddress={publicKey} />
                </CardHeader>
                <CardContent>
                  <LevelProgress playerAddress={publicKey} />
                </CardContent>
              </Card>
            </section>

            <section aria-label="Player statistics" className="mt-6">
              <Card className="bg-[#ececfa] border border-white/40 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl font-semibold text-slate-900">
                    Summary statistics
                  </CardTitle>
                  <CardDescription>
                    Aggregated from all hunts where you have progress via{" "}
                    <code>get_player_progress</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatPill label="Total Hunts Played" value={summary.totalHunts} />
                    <StatPill label="Completed Hunts" value={summary.completedHunts} />
                    <StatPill label="In-Progress Hunts" value={summary.inProgressHunts} />
                    <StatPill
                      label="Total Points Earned"
                      value={summary.totalPoints}
                      valueClassName="text-emerald-600"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <StatPill label="NFT Rewards" value={summary.totalNftRewards ?? 0} />
                    <StatPill label="NFTs Claimed" value={summary.claimedNftRewards ?? 0} />
                    <StatPill label="NFTs Unclaimed" value={summary.unclaimedNftRewards ?? 0} />
                  </div>
                  <div className="mt-4 text-sm text-slate-600">
                    Completion rate:{" "}
                    <span className="font-semibold text-slate-800">{summary.completionRate}%</span>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section aria-label="Registered hunts" className="mt-6">
              <Card className="bg-[#ececfa] border border-white/40 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl font-semibold text-slate-900">
                    Registered hunts
                  </CardTitle>
                  <CardDescription>Hunts you have registered for.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {registrations.length === 0 ? (
                    <p className="text-sm text-slate-500">No registrations yet.</p>
                  ) : (
                    registrations.map((registration) => (
                      <RegistrationCard key={registration.huntId} registration={registration} />
                    ))
                  )}
                </CardContent>
              </Card>
            </section>

            <section aria-label="Referral program" className="mt-6">
              <Card className="bg-[#ececfa] border border-white/40 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl font-semibold text-slate-900">
                    Referral Program
                  </CardTitle>
                  <CardDescription>
                    Invite new players with your wallet-bound link and earn bonus points after their
                    first completed hunt.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <StatPill label="Invites" value={referralStats?.totalInvites ?? 0} />
                    <StatPill label="Successful" value={referralStats?.successfulReferrals ?? 0} />
                    <StatPill label="Pending" value={referralStats?.pendingReferrals ?? 0} />
                    <StatPill
                      label="Bonus Points"
                      value={referralStats?.bonusPoints ?? 0}
                      valueClassName="text-emerald-600"
                    />
                  </div>
                  {referralStats ? (
                    <>
                      <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Referral Link
                        </div>
                        <div className="mt-1 break-all font-mono text-sm text-slate-800">
                          {referralStats.referralLink}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {referralStats.referrals.length === 0 ? (
                          <p className="text-sm text-slate-500">No referrals yet.</p>
                        ) : (
                          referralStats.referrals.slice(0, 5).map((referral) => (
                            <div
                              key={`\( {referral.referredAddress}- \){referral.registeredAt}`}
                              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm"
                            >
                              <span className="font-mono text-slate-700">
                                {shortenAddress(referral.referredAddress)}
                              </span>
                              <span
                                className={
                                  referral.bonusAwarded ? "text-emerald-600" : "text-amber-600"
                                }
                              >
                                {referral.bonusAwarded ? "Bonus awarded" : "Pending"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <section aria-label="NFT gallery" className="mt-6">
              <NftGallery rewards={nftRewards} />
            </section>

            <section aria-label="Reward history" className="mt-6">
              <RewardHistorySection history={rewardHistory} />
            </section>

            <section aria-label="Achievements" className="mt-6">
              <AchievementShowcase playerAddress={publicKey} />
            </section>

            {(profileStats || attemptHistory.length > 0 || savedHunts.length > 0) && (
              <section aria-label="Extra profile data" className="mt-6 space-y-4">
                {attemptHistory.length > 0 ? (
                  <Card className="border border-slate-200 bg-white/80">
                    <CardHeader>
                      <CardTitle className="text-base">Recent attempts</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">
                      {attemptHistory.length} recorded attempt
                      {attemptHistory.length === 1 ? "" : "s"}
                    </CardContent>
                  </Card>
                ) : null}
                {savedHunts.length > 0 ? (
                  <Card className="border border-slate-200 bg-white/80">
                    <CardHeader>
                      <CardTitle className="text-base">Saved hunts</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">
                      {savedHunts.length} favorite{savedHunts.length === 1 ? "" : "s"}
                    </CardContent>
                  </Card>
                ) : null}
              </section>
            )}

            <section aria-label="Hunt lists" className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card className="border border-slate-200 bg-white/80">
                <CardHeader>
                  <CardTitle className="text-base">Completed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {completedHunts.length === 0 ? (
                    <p className="text-slate-500">None yet.</p>
                  ) : (
                    completedHunts.map((h) => (
                      <div key={h.id} className="flex justify-between gap-2">
                        <Link href={`/hunt/${h.id}`} className="font-medium text-slate-800">
                          {h.title}
                        </Link>
                        <span className="text-emerald-600">{h.pointsEarned} pts</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="border border-slate-200 bg-white/80">
                <CardHeader>
                  <CardTitle className="text-base">In progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {inProgressHunts.length === 0 ? (
                    <p className="text-slate-500">None yet.</p>
                  ) : (
                    inProgressHunts.map((h) => (
                      <div key={h.id} className="flex justify-between gap-2">
                        <Link href={`/hunt/${h.id}`} className="font-medium text-slate-800">
                          {h.title}
                        </Link>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/hunt/${h.id}`}>Continue</Link>
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  );
                      }
