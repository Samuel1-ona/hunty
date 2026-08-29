import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Header } from "@/components/Header";
import Medal from "@/components/icons/Medal";
import { huntStructuredData, StructuredData } from "@/components/StructuredData";
import { formatTimestamp } from "@/lib/dateUtils";
import { buildHuntResultsSummary } from "@/lib/huntResults";
import { isHuntEnded } from "@/lib/huntStatus";
import { getEndedPublicHunts, getHuntById } from "@/lib/huntStore";
import { getAllProgressForHunt } from "@/lib/progressData";
import type { StoredHunt } from "@/lib/types";
import { truncateAddress } from "@/lib/walletAddress";

import HuntResultsSkeleton from "./loading";
import { ResultsShareActions } from "./ResultsShareActions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const hunt = getHuntById(Number(id));
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app";
  const resultsUrl = `${baseUrl}/hunt/${id}/results`;

  if (!hunt || hunt.is_private) {
    return {
      title: "Hunt Not Found | Hunty",
      description: "The hunt results you're looking for don't exist.",
      robots: { index: false, follow: false },
    };
  }

  const ended = isHuntEnded(hunt.status);
  const ogImage = `${baseUrl}/api/og/hunt/${hunt.id}`;
  const description = ended
    ? `See the final leaderboard and results for "${hunt.title}" on Hunty.`
    : `"${hunt.title}" is still in progress on Hunty. Check back after it ends for the final results.`;

  return {
    title: `${hunt.title} — Final Results | Hunty`,
    description,
    keywords: ["hunt results", hunt.title, "scavenger hunt", "leaderboard", "Stellar"],
    authors: [{ name: "Hunty Team" }],
    openGraph: {
      type: "website",
      locale: "en_US",
      url: resultsUrl,
      title: `${hunt.title} — Final Results`,
      description,
      siteName: "Hunty",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: hunt.title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${hunt.title} — Final Results`,
      description,
      images: [ogImage],
      creator: "@huntyapp",
    },
    // Ended hunts get a permanent, indexable results page. A hunt that
    // hasn't ended yet doesn't have final results, so it stays out of the
    // index and points crawlers at the live hunt page instead.
    robots: {
      index: ended,
      follow: true,
      googleBot: {
        index: ended,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical: ended ? resultsUrl : `${baseUrl}/hunt/${hunt.id}`,
    },
  };
}

export function generateStaticParams() {
  return getEndedPublicHunts().map((hunt) => ({ id: String(hunt.id) }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Looks up the hunt and enforces that this page only ever renders final
 * results for a hunt that has actually ended. Exported (in addition to being
 * used by the page below) so the branching can be unit tested without
 * exercising React's server-component rendering pipeline.
 */
export function resolveEndedHuntOrBail(id: string): StoredHunt {
  const hunt = getHuntById(Number(id));
  if (!hunt || hunt.is_private) {
    notFound();
  }

  // The results page is a permanent record of an ended hunt. Hunts still
  // running don't have final results yet, so send visitors to the live page.
  if (!isHuntEnded(hunt.status)) {
    redirect(`/hunt/${hunt.id}`);
  }

  return hunt;
}

async function HuntResultsContent({ id }: { id: string }) {
  const hunt = resolveEndedHuntOrBail(id);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app";
  const entries = getAllProgressForHunt(hunt.id);
  const summary = buildHuntResultsSummary(hunt, entries);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-24">
      <StructuredData data={huntStructuredData(hunt, baseUrl)} />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <Header />

      <div role="main" className="relative max-w-3xl mx-auto px-6 pt-16">
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">
            Final Results
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight mb-4">
          {hunt.title}
        </h1>

        <p className="text-zinc-400 text-lg leading-relaxed mb-10">{hunt.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Players</p>
            <p className="text-white font-semibold text-lg">{summary.totalPlayers}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Completions</p>
            <p className="text-white font-semibold text-lg">{summary.totalCompletions}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Clues</p>
            <p className="text-white font-semibold text-lg">{hunt.cluesCount}</p>
          </div>
          {hunt.endTime && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Ended</p>
              <p className="text-white font-semibold text-sm">{formatTimestamp(hunt.endTime)}</p>
            </div>
          )}
        </div>

        <section aria-labelledby="results-leaderboard-heading" className="mb-12">
          <h2 id="results-leaderboard-heading" className="text-xl font-semibold text-white mb-4">
            Final Leaderboard
          </h2>

          {summary.leaderboard.length === 0 ? (
            <p className="text-zinc-400 bg-white/5 border border-white/10 rounded-2xl p-5">
              No completions were recorded for this hunt.
            </p>
          ) : (
            <ol className="space-y-2">
              {summary.leaderboard.map((entry) => (
                <li
                  key={entry.wallet}
                  className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Medal position={entry.position} />
                    <span className="text-white font-medium">#{entry.position}</span>
                    <span className="text-zinc-300">{truncateAddress(entry.wallet)}</span>
                  </div>
                  <span className="text-white font-semibold">{entry.points} pts</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <ResultsShareActions huntId={hunt.id} huntTitle={hunt.title} />
      </div>
    </div>
  );
}

const page = async ({ params }: PageProps) => {
  const { id } = await params;

  return (
    <Suspense fallback={<HuntResultsSkeleton />}>
      <HuntResultsContent id={id} />
    </Suspense>
  );
};

export default page;
