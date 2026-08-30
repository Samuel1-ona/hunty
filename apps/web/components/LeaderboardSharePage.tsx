'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Copy, Share2, ImageIcon, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { LeaderboardTable } from '@/components/LeaderBoardTable';
import { useWalletStore } from '@/store/useStore';
import type { StoredHunt } from '@/lib/types';

interface LeaderboardSharePageProps {
  huntId: number;
  hunt: StoredHunt | null;
}

export function LeaderboardSharePage({ huntId, hunt }: LeaderboardSharePageProps) {
  const [copiedField, setCopiedField] = useState<'share' | 'embed' | null>(null);
  const walletAddress = useWalletStore((state) => state.walletAddress);

  const shareUrl = useMemo(() => {
    const base = `${typeof window !== 'undefined' ? window.location.origin : 'https://hunty.app'}/hunt/${huntId}/leaderboard`;
    return walletAddress ? `${base}?wallet=${encodeURIComponent(walletAddress)}` : base;
  }, [huntId, walletAddress]);

  const ogImageUrl = useMemo(() => {
    const base = `${typeof window !== 'undefined' ? window.location.origin : 'https://hunty.app'}/api/og/leaderboard?huntId=${huntId}`;
    return walletAddress ? `${base}&wallet=${encodeURIComponent(walletAddress)}` : base;
  }, [huntId, walletAddress]);

  const embedSnippet = useMemo(() => {
    return `<iframe src="${typeof window !== 'undefined' ? window.location.origin : 'https://hunty.app'}/hunt/${huntId}/leaderboard/embed" width="600" height="420" style="border:0;border-radius:16px"></iframe>`;
  }, [huntId]);

  const copyToClipboard = async (value: string, field: 'share' | 'embed') => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast.error('Clipboard access is unavailable in this browser.');
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success(field === 'embed' ? 'Embed snippet copied' : 'Leaderboard link copied');
    window.setTimeout(() => setCopiedField(null), 1600);
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-12 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            asChild
            className="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <Link href={`/hunt/${huntId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Hunt Details
            </Link>
          </Button>
        </div>
        {hunt ? (
          <>
            <div className="mb-8">
              <h1 className="mb-2 text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                {hunt.title} – Leaderboard
              </h1>
              <p className="text-zinc-400 text-lg">
                Spectator Mode – Auto‑refreshes every 30 seconds
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300">
                    Share & embed
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <Share2 className="h-4 w-4" />
                      Public link
                    </div>
                    <p className="mb-3 text-sm text-zinc-400">
                      Share a public leaderboard page with your community.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/15 text-white hover:bg-white/10"
                        onClick={() => copyToClipboard(shareUrl, 'share')}
                      >
                        {copiedField === 'share' ? (
                          'Copied'
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" /> Copy link
                          </>
                        )}
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-zinc-300 hover:bg-white/10"
                      >
                        <a href={shareUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <Code2 className="h-4 w-4" />
                      Embed widget
                    </div>
                    <p className="mb-3 text-sm text-zinc-400">
                      Drop this snippet into a website or blog.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/15 text-white hover:bg-white/10"
                        onClick={() => copyToClipboard(embedSnippet, 'embed')}
                      >
                        {copiedField === 'embed' ? (
                          'Copied'
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" /> Copy embed
                          </>
                        )}
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-zinc-300 hover:bg-white/10"
                      >
                        <a href={ogImageUrl} target="_blank" rel="noreferrer">
                          Preview image
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner">
                <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
                  <ImageIcon className="h-4 w-4" />
                  OG image preview
                </div>
                <Image
                  src={ogImageUrl}
                  alt={`${hunt.title} leaderboard preview`}
                  width={1200}
                  height={630}
                  className="w-full max-w-2xl rounded-xl border border-white/10"
                />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner">
                <LeaderboardTable huntId={huntId} />
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-zinc-400 font-medium">Hunt not found</p>
            <Button
              asChild
              variant="outline"
              className="mt-4 border-white/20 text-white hover:bg-white/10"
            >
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
