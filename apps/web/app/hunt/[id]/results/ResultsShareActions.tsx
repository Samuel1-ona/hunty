"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  buildDeepLink,
  buildHuntOgImageUrl,
  copyShareLink,
  shareOnTelegram,
  shareOnTwitter,
  shareOnWhatsApp,
} from "@/lib/downloadAsImage";

interface ResultsShareActionsProps {
  huntId: number;
  huntTitle: string;
}

export function ResultsShareActions({ huntId, huntTitle }: ResultsShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const resultsPath = `/hunt/${huntId}/results`;
  const shareText = `"${huntTitle}" has wrapped up on Hunty — check out the final results!`;

  const handleCopy = async () => {
    const copiedNow = await copyShareLink(buildDeepLink(resultsPath));
    if (copiedNow) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        onClick={() => shareOnTwitter(shareText, buildDeepLink(resultsPath), buildHuntOgImageUrl(huntId))}
        aria-label="Share results to X"
      >
        Share X
      </Button>
      <Button
        variant="outline"
        onClick={() => shareOnTelegram(shareText, buildDeepLink(resultsPath))}
        aria-label="Share results to Telegram"
      >
        Telegram
      </Button>
      <Button
        variant="outline"
        onClick={() => shareOnWhatsApp(shareText, buildDeepLink(resultsPath))}
        aria-label="Share results to WhatsApp"
      >
        WhatsApp
      </Button>
      <Button onClick={handleCopy} aria-label="Copy link to results page">
        {copied ? "Copied!" : "Copy Link"}
      </Button>
      <Link
        href={`/hunt/${huntId}`}
        className="text-sm text-slate-400 hover:text-white underline underline-offset-4"
      >
        Back to hunt page
      </Link>
    </div>
  );
}
