import { Suspense } from "react";
import { Header } from "@/components/Header";
import { getAllHunts, getHunt } from "@/lib/huntStore";
import type { HuntStatus } from "@/lib/types";
import { formatTimestamp } from "@/lib/dateUtils";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import HuntDetailClient from "./share";
import { HuntCountdown } from "./HuntCountdown";
import { FastestPlayersStrip } from "@/components/FastestPlayersStrip";
import HuntPageSkeleton from "./loading";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const hunt = await getHunt(id);

  if (!hunt) {
    return {
      title: "Hunt Not Found | Hunty",
      description: "The hunt you're looking for doesn't exist.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app";
  const huntUrl = `${baseUrl}/hunt/${hunt.id}`;
  const ogImage = hunt.coverImageCid || `${baseUrl}/og-image.png`;

  return {
    title: `${hunt.title} | Hunty - Scavenger Hunt Game`,
    description: hunt.description || `Join the "${hunt.title}" scavenger hunt on Hunty. Solve clues, complete challenges, and earn XLM tokens or exclusive NFTs!`,
    keywords: ["hunt", hunt.title, "scavenger hunt", "game", "blockchain", "Stellar"],
    authors: [{ name: "Hunty Team" }],
    openGraph: {
      type: "website",
      locale: "en_US",
      url: huntUrl,
      title: hunt.title,
      description: hunt.description || `Join the "${hunt.title}" scavenger hunt on Hunty. Solve clues, complete challenges, and earn rewards!`,
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
      title: hunt.title,
      description: hunt.description || `Join the "${hunt.title}" scavenger hunt on Hunty. Solve clues, complete challenges, and earn rewards!`,
      images: [ogImage],
      creator: "@huntyapp",
    },
    robots: {
      index: hunt.status === "Active",
      follow: true,
      googleBot: {
        index: hunt.status === "Active",
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical: huntUrl,
    },
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return getAllHunts().map((hunt) => ({ id: String(hunt.id) }));
}

async function HuntPageContent({ id }: { id: string }) {
  const huntDetails = await getHunt(id);
  if (!huntDetails) return notFound();

  const statusStyles: Record<string, { label: HuntStatus; classes: string }> = {
    active: {
      label: "Active",
      classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    },
    upcoming: {
      label: "Draft",
      classes: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    },
    ended: {
      label: "Completed",
      classes: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30",
    },
  };

  const status = statusStyles[huntDetails.status] ?? statusStyles["upcoming"];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app"

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-24">
      
      <StructuredData data={huntStructuredData(huntDetails, baseUrl)} />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <Header />

      <div role="main" className="relative max-w-3xl mx-auto px-6 pt-16">
        {/* Status badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase ${status.classes}`}>
            {huntDetails?.status === "Active" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {status.label}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight mb-4">
          {huntDetails.title}
        </h1>

        <p className="text-zinc-400 text-lg leading-relaxed mb-10">
          {huntDetails.description}
        </p>

        {/* Metadata cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Hunt ID</p>
            <p className="text-white font-semibold text-lg">#{huntDetails.id}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Clues</p>
            <p className="text-white font-semibold text-lg">{huntDetails.cluesCount}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <p className="text-white font-semibold text-lg capitalize">{huntDetails.status}</p>
          </div>
          {huntDetails.startTime && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Starts</p>
              <p className="text-white font-semibold text-sm">{formatTimestamp(huntDetails.startTime)}</p>
            </div>
          )}
          {huntDetails.endTime && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Ends</p>
              <p className="text-white font-semibold text-sm">{formatTimestamp(huntDetails.endTime)}</p>
            </div>
          )}
          {huntDetails.status === "Active" && huntDetails.endTime && (
            <HuntCountdown endTime={huntDetails.endTime} />
          )}
        </div>

        <FastestPlayersStrip huntId={huntDetails.id} />

        <HuntDetailClient hunt={huntDetails}  />
      </div>
    </div>
  );
}

const page = async ({ params }: PageProps) => {
  const { id } = await params;

  return (
    <Suspense fallback={<HuntPageSkeleton />}>
      <HuntPageContent id={id} />
    </Suspense>
  );
};

export default page;