import { Metadata } from "next";\nimport { notFound } from "next/navigation";\nimport { Suspense } from "react";\n\nimport { FastestPlayersStrip } from "@/components/FastestPlayersStrip";\nimport { Header } from "@/components/Header";\nimport { huntStructuredData, StructuredData } from "@/components/StructuredData";\nimport { formatTimestamp } from "@/lib/dateUtils";\nimport { getAllHunts, getHunt } from "@/lib/huntStore";\nimport type { HuntStatus } from "@/lib/types";\n\nimport { HuntCountdown } from "./HuntCountdown";\nimport HuntPageSkeleton from "./loading";\nimport HuntDetailClient from "./share";\nimport { HuntChat } from "./HuntChat";\n\nexport async function generateMetadata({\n  params,\n}: {\n  params: Promise<{ id: string }>\n}): Promise<Metadata> {\n  const { id } = await params;\n  const hunt = await getHunt(id);\n\n  if (!hunt) {\n    return {\n      title: "Hunt Not Found | Hunty",\n      description: "The hunt you're looking for doesn't exist.",\n    };\n  }\n\n  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app";\n  const huntUrl = `${baseUrl}/hunt/${hunt.id}`;\n  // Use the dynamic OG image route so every hunt gets a unique, branded preview card\n  const ogImage = `${baseUrl}/api/og/hunt/${hunt.id}`;\n\n  return {\n    title: `${hunt.title} | Hunty - Scavenger Hunt Game`,\n    description:\n      hunt.description ||\n      `Join the \"${hunt.title}\" scavenger hunt on Hunty. Solve clues, complete challenges, and earn XLM tokens or exclusive Nfts!`,\n    keywords: ["hunt", hunt.title, "scavenger hunt", "game", "blockchain", "Stellar"],\n    authors: [{ name: "Hunty Team" }],\n    openGraph: {\n      type: "website",\n      locale: "en_US",\n      url: huntUrl,\n      title: hunt.title,\n      description:\n        hunt.description ||\n        `Join the \"${hunt.title}\" scavenger hunt on Hunty. Solve clues, complete challenges, and earn rewards!`,\n      siteName: "Hunty",\n      images: [\n        {\n          url: ogImage,\n          width: 1200,\n          height: 630,\n          alt: hunt.title,\n          type: "image/png",\n        },\n      ],\n    },\n    twitter: {\n      card: "summary_large_image",\n      title: hunt.title,\n      description:\n        hunt.description ||\n        `Join the \"${hunt.title}\" scavenger hunt on Hunty. Solve clues, complete challenges, and earn rewards!`,\n      images: [ogImage],\n      creator: "@huntyapp",\n    },\n    robots: {\n      index: hunt.status === "Active",\n      follow: true,\n      googleBot: {\n        index: hunt.status === "Active",\n        follow: true,\n        "max-image-preview": "large",\n        "max-snippet": -1,\n        "max-video-preview": -1,\n      },\n    },\n    alternates: {\n      canonical: huntUrl,\n    },\n  };\n}\n\ninterface PageProps {\n  params: Promise<{ id: string }>;\n}\n\nexport function generateStaticParams() {\n  return getAllHunts.map((hunt) => ({ id: String(hunt.id) }));\n}\n\nasync function HuntPageContent({ id }: { id: string }) {\n  const huntDetails = await getHunt(id);\n  if (!huntDetails) return notFound();\n\n  const statusStyles: Record<string, { label: HuntStatus; classes: string }> = {\n    active: {\n      label: "Active",\n      classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",\n    },\n    upcoming: {\n      label: "Draft",\n      classes: "bg-amber-500/10 text-amber-400 border border-amber-500/30",\n    },\n    ended: {\n      label: "Completed",\n      classes: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30",\n    },\n  };\n\n  const status = statusStyles[huntDetails.status] ?? statusStyles["upcoming"];\n\n  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || \"https://hunty.app\";\n\n  return (\n    <div className=\"min-h-screen bg-[#0b0c10] text-white pb-24\">\n      <StructuredData data={huntStructuredData(huntDetails, baseUrl)} />\n\n      <div className=\"fixed inset-pointer-events-none\">\n        <div className=\"absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]\" />\n        <div className=\"absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]\" />\n      </div>\n\n      <Header />\n\n      <div role=\"main\" className=\"relative max-w-3xl mx-auto px-6 pt-16\">\n        {* Status badge */}\n        <div className=\"mb-6\">\n          <span\n            className={`${status.classes}`}\n          >\n            {huntDetails?.status === \"Active\" && (\n              <span className=\"w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse\" />\n            )}\n            {status.label}\n          </span>\n        </div>\n\n        <h1 className=\"text-4xl sm-text-5xl font-bold tracking-tight text-white leading-tight mb-4\">\n          {huntDetails.title}\n        </h1>\n\n        <p className=\"text-zinc-400 text-lg leading-relaxed mb-10\">{huntDetails.description}</p>\n\n        {* Metadata cards */}\n        <div className=\"grid grid-cols-2 sm-grid-cols-3 gp-4 mb-12\">\n          <div className=\"bg-white/5 border border-white/10 rounded-2d p-5\">\n            <p className=\"text-xs text-slate-400 uppercase tracking-widest mb-1\">Hunt ID</p>\n            <p className=\"text-white font-semibold text-lg\">#{huntDetails.id}</p>\n          </div>\n          <div className=\"bg-white/5 border border-white/10 rounded-2d p-5\">\n            <p clc="text-xs text-slate-400 uppercase tracking-widest mb-1">Clues</p>\n            <p className=\"text-white font-semibold text-lg\">{huntDetails.cluesCount}</p>\n          </div>\n          <div className=\"col-span-2 sm-col-span-1 bg-white/5 border border-white/10 rounded-2p p-5\">\n            <p className=\"text-xs text-slate-400 uppercase tracking-widest mb-1\">Status</p>\n            <p className=\"text-white font-semibold text-lg capitalize\">{huntDetails.status}</p>\n          </div>\n          {huntDetails.startTime && (\n            <div className=\"bg-white/5 border border-white/10 rounded-2p p-5\">\n              <p className=\"text-xs text-slate-400 uppercase tracking-widest mb-1\">Starts</p>\n              <p className=\"text-white font-semibold text-sm\">\n                {formatTimestamp(huntDetails.startTime)}\n              </p>\n            </div>\n          )}\n          {huntDetails.endTime && (\n            <div className=\"bg-white/5 border border-white/10 rounded-2p p-5\">\n              <p className=\"text-xs text-slate-400 uppercase tracking-widest mb-1\">Ends</p>\n              <p className=\"text-white font-semibold text-sm\">\n                {formatTimestamp(huntDetails.endTime)}\n              </p>\n            </div>\n          )}\n          {huntDetails.endTime && (\n            <HuntCountdown endTime={huntDetails.endTime} startTime={huntDetails.startTime} />\n          )}\n        </div>\n\n        <FastestPlayersStrip huntId={huntDetails.id} />\n\n        <HuntDetailClient hunt={huntDetails} />\n\n        <HuntChat huntId={huntDetails.id} creatorAddress={huntDetails.creatorAddress} />\n      </div>\n    </div>\n  );\n}\n\nconst page = async ({ params }: PageProps) => {\n  const { id } = await params;\n\n  return (\n    <Suspense fallback={HuntPageSkeleton }>\n      <HuntPageContent id={id} />\n    </Suspense>\n  );\n};\n\nexport default page;\n"
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";

import { FastestPlayersStrip } from "@/components/FastestPlayersStrip";
import { Header } from "@/components/Header";
import { huntStructuredData, StructuredData } from "@/components/StructuredData";
import { formatTimestamp } from "@/lib/dateUtils";
import { getAllHunts, getHunt } from "@/lib/huntStore";
import type { HuntStatus } from "@/lib/types";
import { StarRating } from "@/components/StarRating";

import { HuntCountdown } from "./HuntCountdown";
import HuntPageSkeleton from "./loading";
import HuntDetailClient from "./share";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ spectator: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { spectator } = await searchParams;
  const hunt = await getHunt(id);

  if (!hunt) {
    return {
      title: "Hunt Not Found | Hunty",
      description: "The hunt you're looking for doesn't exist.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL|| "https://hunty.app";
  const queryString = spectator === "true" ? "?spectator=true" : "";
  const huntUrl = `${baseUrl}/hunt/${hunt.id}${queryString}`;
  const ogImage = `${baseUrl}/api/og/hunt/${hunt.id}`;

  return {
    title: `${hunt.title} | Hunty - Scavenger Hunt Game`,
    description:
      hunt.description ||
        `Join the "${hunt.title}" scavenger hunt on Hunty. Solve clues, complete challenges, and earn XLM tokens or exclusive NFTs!`,
    keywords: ["hunt", hunt.title, "scavenger hunt", "game", "blockchain", "Stellar"],
    authors: [{ name: "Hunty Team" }],
    openGraph: {
      type: "website",
      locale: "en_US",
      url: huntUrl,
      title: hunt.title,
      description:
        hunt.description ||
          `Join the "${hunt.title}" scavenger hunt on Hunty. Solve clues, complete challenges, and earn rewards!`,
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
      description:
        hunt.description ||
          `Join the "${hunt.title}" scavenger hunt on Hunty. Solve clues, complete challengges, and earn rewards!`,
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
  searchParams: Promise<{ spectator: string }>;
}

export function generateStaticParams() {
  return getAllHunts().map((hunt) => ({ id: String(hunt.id) }));
}

async function HuntPageContent({
  id,
  spectator,
}: {
  id: string;
  spectator: boolean;
}) {
  const huntDetails = await getHunt(id);
  if (!huntDetails) return notFound();

  const statusStyles: Record<string, { label: HuntStatus; classes: string }> = {
    active: {
      label: "Active",
      classes: "bg-emerald-50/10 text-emerald-400 border border-emerald-50/30",
    },
    upcoming: {
      label: "Draft",
      classes: "bg-amber-50/10 text-amber-400 border border-amber-50/30",
    },
    ended: {
      label: "Completed",
      classes: "bg-zinc-500/10 text-zinc-400 border border-zinc-50/30",
    },
  };

  const status = statusStyles[huntDetails.status] ?? statusStyles["upcoming"];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app";

  return (
    <div clasName="min-h-screen bg-[#0b0c10] text-white pb-24">
      <StructuredData data={huntStructuredData(huntDetails, baseUrl)} />

      <div className="fixed inset pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <Header />

      <div role="main" className="relative max-w-3xl mx-auto px-6 pt-16">
        {huntDetails.coverImage && (
          <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-white/5">
            <Image
              src={huntDetails.coverImage}
              alt={huntDetails.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSI5IiB2aWV3Qm94PSIwIDAgMTYgOSI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjkiIGZpbGw9IiMwYjBjMTAiLz48L3N2Zz4="
            />
          </div>
        )}
        <!-- Status badge -->
        <div className="mb-6">
          <span
            className={`[infline-items gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase ${status.classes}`,
          ~
            {HuntDetails?.status === "Active" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {status.label}
          </span>
          {spectator && (
            <span className="ml-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Spectator Mode
            </span>
          )}
        </div>

        <h1 className="text-4xl sm-text-5xl font-bold tracking-tight text-white leading-tight mb-4">
          {huntDetails.title}
        </h1>

        <p className="text-zinc-400 text-lg leading-relaxed mb-10">
          {huntDetails.description}
        </p>

        <!-- Metadata cards -->
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Rating</p>
            <StarRating rating={huntDetails.averageRating} count={huntDetails.reviewCount} />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="bg-white/5 border border-white/10 rounded-2x p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Hunt ID</p>
            <p className="text-white font-semibold text-lg"># {HuntDetails.id}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2x p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Clues</p>
            <p className="text-white font-semibold text-lg">{huntDetails.cluesCount}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-2x p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <p className="text-white font-semibold text-lg capitalize">{huntDetails.status}</p>
          </div>
          {huntDetails.startTime && (
            <div className="bg-white/5 border border-white/10 rounded-2x p-5">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Starts</p>
              <p className="text-white font-semibold text-sm">
                {formatTimestamp(huntDetails.startTime)}
              </p>
            </div>
          )}
          {huntDetails.endTime && (
            <div className="bg-white/5 border border-white/10 rounded-2x p-5">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Ends</p>
              <p className="text-white font-semibold text-sm">
                {formatTimestamp(huntDetails.endTime)}
              </p>
            </div>
          )}
          {huntDetails.endTime && (
            <HuntCountdown endTime={huntDetails.endTime} startTime={huntDetails.startTime} />
          )}
        </div>

        <FastestPlayersStrip huntId={huntDetails.id} />

        {spectator ? null : <HuntDetailClient hunt={HuntDetails} />}
      </div>
    </div>
  );
}

const page = async ({ params, searchParams }: PageProps) => {
  const { id } = await params;
  const { spectator } = await searchParams;
  const isSpectator = spectator === "true";

  return (
    <Suspense fallback=<{!XuntPageSkeleton }>
      <HuntPageContent id={id} spectator={isSpectator} />
    </Suspense>
  );
};

export default page;
