"use client";

import { useEffect, useMemo } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stageLabel, useNftMint, type MintStage } from "@/hooks/useNftMint";

interface NftMintProgressProps {
  huntId: number;
  rank?: number;
  completionTimeSeconds?: number;
  imageCid?: string;
  recipientAddress?: string;
}

const ORDERED_STAGES: MintStage[] = [
  "building_metadata",
  "uploading_metadata",
  "estimating_fee",
  "signing",
  "submitting",
  "confirming",
];

export function NftMintProgress({
  huntId,
  rank,
  completionTimeSeconds,
  imageCid,
  recipientAddress,
}: NftMintProgressProps) {
  const { stage, feeEstimate, result, error, mint, estimate, reset, abort } = useNftMint();

  // Lazily estimate the fee on mount so the UI can show it before mint.
  useEffect(() => {
    void estimate(huntId, recipientAddress);
  }, [estimate, huntId, recipientAddress]);

  const activeIndex = useMemo(
    () => (stage === "idle" ? -1 : ORDERED_STAGES.indexOf(stage)),
    [stage]
  );

  const isBusy =
    stage !== "idle" && stage !== "complete" && stage !== "error";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Mint hunt reward NFT</h3>
        <p className="text-sm text-slate-600">
          Build metadata, upload to IPFS, and mint on Soroban. Track progress below.
        </p>
      </div>

      {feeEstimate && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-700">
            Estimated fee: {feeEstimate.feeXlm} XLM{" "}
            <span className="text-slate-500">({feeEstimate.feeStroops.toLocaleString()} stroops)</span>
          </p>
          <p className="text-xs text-slate-500">
            {feeEstimate.simulated
              ? "Estimate from live simulateTransaction."
              : "Conservative default estimate (simulation unavailable)."}
          </p>
        </div>
      )}

      <ol className="mb-4 space-y-2">
        {ORDERED_STAGES.map((step, index) => {
          const done = index < activeIndex || stage === "complete";
          const active = index === activeIndex;
          const failed = stage === "error" && active;
          return (
            <li key={step} className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : active ? (
                failed ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                )
              ) : (
                <span className="h-4 w-4 rounded-full border border-slate-300" />
              )}
              <span
                className={
                  done
                    ? "text-slate-700"
                    : active
                      ? failed
                        ? "font-medium text-red-700"
                        : "font-medium text-indigo-700"
                      : "text-slate-400"
                }
              >
                {stageLabel(step)}
              </span>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Mint complete
          </p>
          <p className="mt-1 break-all text-green-700">Tx: {result.txHash}</p>
          <p className="mt-1 break-all text-green-700">Metadata: {result.metadataUri}</p>
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 font-medium text-green-700 underline"
          >
            View on Stellar Expert <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!isBusy && !result && (
          <Button
            onClick={() =>
              void mint({
                huntId,
                rank,
                completionTimeSeconds,
                imageCid,
                recipientAddress,
              })
            }
          >
            <RotateCw className="h-4 w-4" />
            <span>Mint NFT</span>
          </Button>
        )}
        {isBusy && (
          <Button variant="outline" onClick={abort}>
            Cancel
          </Button>
        )}
        {stage === "error" && (
          <Button
            onClick={() =>
              void mint({
                huntId,
                rank,
                completionTimeSeconds,
                imageCid,
                recipientAddress,
              })
            }
          >
            <RotateCw className="h-4 w-4" />
            <span>Retry mint</span>
          </Button>
        )}
        {result && (
          <Button variant="outline" onClick={reset}>
            Mint another
          </Button>
        )}
      </div>
    </div>
  );
}