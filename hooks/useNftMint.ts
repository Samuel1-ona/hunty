"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  mintHuntRewardNft,
  estimateMintFee,
  saveMintReceipt,
  type FeeEstimate,
  type MintResult,
} from "@/lib/nft/minter";
import type { MintStage } from "@/lib/nft/minter";

export type { MintStage } from "@/lib/nft/minter";

export interface UseNftMintResult {
  stage: MintStage;
  feeEstimate: FeeEstimate | null;
  result: MintResult | null;
  error: string | null;
  estimate: (huntId: number, recipientAddress?: string) => Promise<void>;
  mint: (input: {
    huntId: number;
    recipientAddress?: string;
    imageCid?: string;
    rank?: number;
    completionTimeSeconds?: number;
  }) => Promise<MintResult | null>;
  reset: () => void;
  abort: () => void;
}

const STAGE_LABEL: Record<MintStage, string> = {
  idle: "Idle",
  building_metadata: "Building metadata",
  uploading_metadata: "Uploading to IPFS",
  estimating_fee: "Estimating fee",
  signing: "Waiting for wallet signature",
  submitting: "Submitting mint transaction",
  confirming: "Confirming transaction",
  complete: "Mint complete",
  error: "Mint failed",
};

export function stageLabel(stage: MintStage): string {
  return STAGE_LABEL[stage] ?? stage;
}

export function useNftMint(): UseNftMintResult {
  const [stage, setStage] = useState<MintStage>("idle");
  const [feeEstimate, setFeeEstimate] = useState<FeeEstimate | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const estimate = useCallback(
    async (huntId: number, recipientAddress?: string) => {
      setError(null);
      try {
        const estimate = await estimateMintFee(huntId, recipientAddress);
        setFeeEstimate(estimate);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fee estimation failed");
      }
    },
    []
  );

  const mint = useCallback<UseNftMintResult["mint"]>(async (input) => {
    setError(null);
    setResult(null);
    setStage("building_metadata");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const mintResult = await mintHuntRewardNft({
        ...input,
        signal: controller.signal,
        onStage: (next) => setStage(next),
      });
      saveMintReceipt(input, mintResult);
      setResult(mintResult);
      toast.success("NFT minted successfully");
      return mintResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mint failed";
      setError(message);
      setStage("error");
      toast.error(message);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStage("idle");
    setResult(null);
    setError(null);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStage("idle");
    setError("Mint cancelled");
  }, []);

  return { stage, feeEstimate, result, error, estimate, mint, reset, abort };
}