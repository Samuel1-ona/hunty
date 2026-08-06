"use client";

import { Search, Filter, ArrowUpDown, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@hunty/ui";
import { Input } from "@/components/ui/input";
import { getAllRewardEscrows } from "@/lib/contracts/rewardManager";
import { getHuntById } from "@/lib/huntStore";
import { getActiveWalletAdapter } from "@/lib/walletAdapter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RewardEscrow } from "@/lib/contracts/rewardManager";

type EscrowStatus = "all" | "approved" | "active" | "disputed" | "resolved" | "released";
type EscrowRole = "all" | "sender" | "receiver" | "disputeResolver";
type DateSort = "newest" | "oldest";

interface EscrowFilterState {
  status: EscrowStatus;
  role: EscrowRole;
  dateSort: DateSort;
  search: string;
}

interface EscrowDrawerProps {
  open: boolean;
  onClose: () => void;
}

function deriveStatus(escrow: RewardEscrow): string {
  if (escrow.balance <= 0 && escrow.distributions.length > 0) {
    if (escrow.refunds.length > 0) return "disputed";
    return "released";
  }
  if (escrow.balance <= 0 && escrow.distributions.length === 0) {
    return "resolved";
  }
  if (escrow.balance > 0) {
    if (escrow.refunds.length > 0) return "disputed";
    return "active";
  }
  return "approved";
}

function deriveRole(escrow: RewardEscrow, walletAddress?: string): EscrowRole {
  if (!walletAddress) return "sender";
  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedCreator = escrow.creator.toLowerCase();

  if (normalizedWallet === normalizedCreator) return "sender";

  const allRecipients = [
    ...escrow.distributions.map((d) => d.to?.toLowerCase()),
    ...escrow.refunds.map((r) => r.to?.toLowerCase()),
  ];
  if (allRecipients.includes(normalizedWallet)) return "receiver";

  return "sender";
}

function escrowsMatchFilters(
  escrow: RewardEscrow,
  filters: EscrowFilterState,
  walletAddress?: string
): boolean {
  const status = deriveStatus(escrow);
  const role = deriveRole(escrow, walletAddress);

  if (filters.status !== "all" && status !== filters.status) return false;
  if (filters.role !== "all" && role !== filters.role) return false;

  if (filters.search.trim()) {
    const query = filters.search.toLowerCase().trim();
    const hunt = getHuntById(escrow.huntId);
    const titleMatch = hunt?.title.toLowerCase().includes(query) ?? false;
    const idMatch = escrow.huntId.toString().includes(query);
    const txMatch = escrow.depositTxHash.toLowerCase().includes(query);
    if (!titleMatch && !idMatch && !txMatch) return false;
  }

  return true;
}

function sortEscrows(escrows: RewardEscrow[], sort: DateSort): RewardEscrow[] {
  return [...escrows].sort((a, b) => {
    if (sort === "newest") return b.createdAt - a.createdAt;
    return a.createdAt - b.createdAt;
  });
}

export function EscrowDrawer({ open, onClose }: EscrowDrawerProps) {
  const [filters, setFilters] = useState<EscrowFilterState>({
    status: "all",
    role: "all",
    dateSort: "newest",
    search: "",
  });
  const [walletAddress, setWalletAddress] = useState<string | undefined>();

  useEffect(() => {
    try {
      const adapter = getActiveWalletAdapter();
      adapter
        .getPublicKey()
        .then(setWalletAddress)
        .catch(() => {});
    } catch {
      /* no wallet connected */
    }
  }, [open]);

  const escrows = useMemo(() => getAllRewardEscrows(), []);

  const filteredEscrows = useMemo(() => {
    const base = escrows.filter((escrow) => escrowsMatchFilters(escrow, filters, walletAddress));
    return sortEscrows(base, filters.dateSort);
  }, [escrows, filters, walletAddress]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.role !== "all") count++;
    if (filters.search.trim()) count++;
    return count;
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({ status: "all", role: "all", dateSort: "newest", search: "" });
  }, []);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Escrows</h2>
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close escrow drawer">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search title or ID..."
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="h-8 rounded-lg pl-8 text-xs"
                    variant="ghost"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                      <Filter className="h-3 w-3" />
                      Status
                      {filters.status !== "all" && (
                        <span className="ml-0.5 rounded-full bg-blue-100 px-1.5 py-0 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          1
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[
                      { value: "all", label: "All Statuses" },
                      { value: "approved", label: "Approved" },
                      { value: "active", label: "Active" },
                      { value: "disputed", label: "Disputed" },
                      { value: "resolved", label: "Resolved" },
                      { value: "released", label: "Released" },
                    ].map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            status: option.value as EscrowStatus,
                          }))
                        }
                        className={
                          filters.status === option.value
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : ""
                        }
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                      <Filter className="h-3 w-3" />
                      Role
                      {filters.role !== "all" && (
                        <span className="ml-0.5 rounded-full bg-blue-100 px-1.5 py-0 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          1
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[
                      { value: "all", label: "All Roles" },
                      { value: "sender", label: "Sender" },
                      { value: "receiver", label: "Receiver" },
                      { value: "disputeResolver", label: "Resolver" },
                    ].map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            role: option.value as EscrowRole,
                          }))
                        }
                        className={
                          filters.role === option.value
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : ""
                        }
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                      <ArrowUpDown className="h-3 w-3" />
                      Date
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[
                      { value: "newest", label: "Most Recent" },
                      { value: "oldest", label: "Oldest" },
                    ].map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            dateSort: option.value as DateSort,
                          }))
                        }
                        className={
                          filters.dateSort === option.value
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : ""
                        }
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredEscrows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {escrows.length === 0 ? "No escrows found" : "No escrows match your filters"}
                </p>
                {filters.search.trim() || filters.status !== "all" || filters.role !== "all" ? (
                  <Button variant="link" size="sm" onClick={clearFilters} className="mt-2 text-xs">
                    Clear filters
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {filteredEscrows.map((escrow) => {
                  const hunt = getHuntById(escrow.huntId);
                  const status = deriveStatus(escrow);
                  const role = deriveRole(escrow, walletAddress);

                  return (
                    <div
                      key={escrow.huntId}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900/80"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {hunt?.title ?? `Hunt #${escrow.huntId}`}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            ID: {escrow.huntId} · TX: {escrow.depositTxHash.slice(0, 10)}...
                            {escrow.depositTxHash.slice(-6)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {role}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                : status === "released"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                  : status === "disputed"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                    : status === "resolved"
                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            Balance:{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {escrow.balance.toFixed(7)}
                            </span>{" "}
                            XLM
                          </span>
                          <span>
                            Pool:{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {escrow.totalPool.toFixed(7)}
                            </span>{" "}
                            XLM
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(escrow.createdAt * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-4 py-2 text-center text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
            {filteredEscrows.length} of {escrows.length} escrows
          </div>
        </div>
      </div>
    </>
  );
}
 