"use client";

import { useEffect, useState } from "react";
import { LeaderboardSharePage } from "@/components/LeaderboardSharePage";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Header } from "@/components/Header";
import { LeaderboardTable } from "@/components/LeaderBoardTable";
import { Button } from "@hunty/ui";
import { getHuntById } from "@/lib/huntStore";
import type { StoredHunt } from "@/lib/types";

interface LeaderboardPageProps {
  params: Promise<{ id: string }>;
}

export default function LeaderboardPage({ params }: LeaderboardPageProps) {
  const [hunt, setHunt] = useState<StoredHunt | null>(null);
  const [huntId, setHuntId] = useState<number | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      const { id } = await params;
      const huntIdNum = parseInt(id, 10);
      setHuntId(huntIdNum);
      const huntData = getHuntById(huntIdNum);
      setHunt(huntData || null);
    };
    resolveParams();
  }, [params]);

  if (huntId === null) {
    return null;
  }

  return <LeaderboardSharePage huntId={huntId} hunt={hunt} />;
}
