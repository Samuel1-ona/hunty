"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  get_hunt_leaderboard_paginated,
  LeaderboardEntry,
} from "@/lib/contracts/hunt";
import { getActiveWalletAdapter } from "@/lib/walletAdapter"; // adjust path if needed

type Props = { params: Promise<{ id: string }> };

export default function LeaderboardPage({ params }: Props) {
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [currentUserRank, setCurrentUserRank] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const limit = 20;

  // Get wallet address client-side
  useEffect(() => {
    const getAddress = async () => {
      try {
        const wallet = getActiveWalletAdapter();
        const addr = await wallet.getPublicKey();
        setUserAddress(addr);
      } catch (e) {
        // User might not be connected
        setUserAddress(null);
      }
    };
    getAddress();
  }, []);

  const fetchPage = async (pageNum: number) => {
    setLoading(true);
    const { id } = await params;
    const huntId = parseInt(id, 10);
    const data = await get_hunt_leaderboard_paginated(
      huntId,
      pageNum,
      limit,
      userAddress || undefined,
    );
    setPlayers(data.entries);
    setTotal(data.total);
    setCurrentUserRank(data.currentUserRank);
    setLoading(false);
  };

  // Fetch on page or address change, and poll every 5 seconds
  useEffect(() => {
    if (userAddress === undefined) return; // wait for address to load
    fetchPage(page);
    const interval = setInterval(() => fetchPage(page), 5000);
    return () => clearInterval(interval);
  }, [page, userAddress]);

  const totalPages = Math.ceil(total / limit);
  const goPrev = () => setPage((p) => Math.max(p - 1, 1));
  const goNext = () => setPage((p) => Math.min(p + 1, totalPages));

  if (loading && players.length === 0)
    return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Hunt Leaderboard</h1>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Rank</th>
            <th className="border p-2">Player</th>
            <th className="border p-2">Points</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {players.map((p, i) => {
              const isMe = userAddress && p.address === userAddress;
              return (
                <motion.tr
                  key={p.address}
                  layout="position"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className={isMe ? "bg-yellow-100" : ""}
                >
                  <td className="border p-2 text-center">
                    {(page - 1) * limit + i + 1}
                  </td>
                  <td className="border p-2">
                    {p.name || p.address.slice(0, 6)}…
                    {isMe && (
                      <span className="ml-2 bg-yellow-300 px-2 rounded text-sm">
                        You
                      </span>
                    )}
                  </td>
                  <td className="border p-2 text-center">{p.points}</td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={goPrev}
          disabled={page === 1}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={goNext}
          disabled={page === totalPages}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
      {currentUserRank && (
        <div className="mt-2 text-sm text-gray-600">
          Your rank: #{currentUserRank}
        </div>
      )}
    </div>
  );
}
