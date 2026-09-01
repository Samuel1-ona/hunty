"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { Header } from "@/components/Header";
import { PlayerProfileView, ProfilePageHeading } from "@/components/PlayerProfileView";
import { Button } from "@hunty/ui";

interface PublicProfilePageProps {
  params: Promise<{ address: string }>;
}

/**
 * Public hunter profile — `/profile/<stellar-address>`.
 *
 * Accessible without a wallet: anyone can open a player's profile from a
 * leaderboard entry and see their aggregated stats and completion timeline.
 */
export default function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { address } = use(params);
  const decodedAddress = decodeURIComponent(address ?? "").trim();

  return (
    <div className="min-h-screen bg-linear-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] pb-20">
      <Header />

      <div className="mx-auto max-w-[1500px] rounded-4xl bg-white px-6 pb-12 pt-4 sm:px-10">
        <Button
          variant="ghost"
          asChild
          className="mb-4 w-fit px-0 text-slate-700 hover:text-slate-900"
        >
          <Link href="/leaderboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to leaderboard
          </Link>
        </Button>

        <ProfilePageHeading
          title="Hunter Profile"
          subtitle="Public stats and hunt history for"
          address={decodedAddress}
        />

        <PlayerProfileView address={decodedAddress} isOwnProfile={false} />
      </div>
    </div>
  );
}
 