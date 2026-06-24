"use client";

import { HuntControls } from "@/components/HuntControls";
import { Button } from "@/components/ui/button";
import { QrCode, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import { QrCodeModal } from "@/components/QrCodeModal";
import type { StoredHunt } from "@/lib/types";
import { updateHuntStatus } from "@/lib/huntStore";
import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { RegistrationButton } from "@/components/RegistrationButton";
import { PlayInterfaceGuard } from "@/components/PlayInterfaceGuard";
import { 
  checkRegistrationStatus, 
  registerPlayer, 
  clearRegistrationCache,
  isWalletAvailable,
  RegistrationStatus 
} from "@/lib/contracts/player-registration";
import { useQueryClient } from "@tanstack/react-query";
import { debounce } from "@/lib/debounce";
import { REGISTRATION_STATUS_DEBOUNCE_MS } from "@/lib/soroban/queryConfig";
import { distributeCompletionReward } from "@/lib/contracts/rewardManager";
import { withTransactionToast } from "@/lib/txToast";
import type { RewardReceipt } from "@/lib/types";

interface HuntDetailProps {
  hunt: StoredHunt;
}

export default function HuntShare({ hunt }: HuntDetailProps) {
  const router = useRouter();
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);
  const [rewardReceipt, setRewardReceipt] = useState<RewardReceipt | null>(null);
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [connectedPublicKey, setConnectedPublicKey] = useState<string | undefined>(undefined);
  const [walletCheckComplete, setWalletCheckComplete] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>({
    isRegistered: false,
    loading: true,
  });
  const [qrOpen, setQrOpen] = useState(false);

  // Check wallet availability and connection on mount
  useEffect(() => {
    // Check if wallet is available
    if (!isWalletAvailable()) {
      setWalletCheckComplete(true);
      setRegistrationStatus({
        isRegistered: false,
        loading: false,
        error: "No wallet detected. Please install Freighter or another Soroban-compatible wallet.",
      });
      return;
    }

    // Try to get connected wallet address
    const win = window as Window & {
      freighter?: { getPublicKey?: () => Promise<string> };
      soroban?: { getPublicKey?: () => Promise<string> };
      sorobanWallet?: { getPublicKey?: () => Promise<string> };
    };
    const wallet = win.freighter ?? win.soroban ?? win.sorobanWallet;
    
    if (wallet?.getPublicKey) {
      wallet.getPublicKey()
        .then((key) => {
          setConnectedPublicKey(key);
          setWalletCheckComplete(true);
        })
        .catch(() => {
          setWalletCheckComplete(true);
          setRegistrationStatus({
            isRegistered: false,
            loading: false,
            error: "Please connect your wallet to continue",
          });
        });
    } else {
      setWalletCheckComplete(true);
      setRegistrationStatus({
        isRegistered: false,
        loading: false,
        error: "Please connect your wallet to continue",
      });
    }
  }, []);

  const refreshRegistrationStatus = useCallback(async (isActive: () => boolean = () => true) => {
    if (!walletCheckComplete || !isActive()) {
      return;
    }

    if (!connectedPublicKey) {
      if (isActive()) {
        setRegistrationStatus({
          isRegistered: false,
          loading: false,
          error: "Please connect your wallet to continue",
        });
      }
      return;
    }

    // Set loading state
    setRegistrationStatus({
      isRegistered: false,
      loading: true,
    });

    const status = await checkRegistrationStatus(hunt.id, connectedPublicKey);
    if (isActive()) {
      setRegistrationStatus(status);
    }
  }, [hunt.id, connectedPublicKey, walletCheckComplete]);

  // Check registration status when wallet is connected (Requirement 1.1, 2.3)
  useEffect(() => {
    let isActive = true;
    const debouncedCheckStatus = debounce(
      () => {
        void refreshRegistrationStatus(() => isActive);
      },
      REGISTRATION_STATUS_DEBOUNCE_MS
    );

    debouncedCheckStatus();

    return () => {
      isActive = false;
      debouncedCheckStatus.cancel();
    };
  }, [refreshRegistrationStatus]);

  // Handle player registration (Requirements 1.3, 1.4, 1.5)
  const handleRegister = async () => {
    if (!connectedPublicKey) {
      return;
    }

    const result = await registerPlayer(hunt.id, connectedPublicKey);
    
    if (result.success) {
      // Clear cache and refresh registration status after successful registration
      clearRegistrationCache(hunt.id, connectedPublicKey);
      await refreshRegistrationStatus();
    } else {
      // Error is already handled by RegistrationButton component
      throw new Error(result.error || "Registration failed");
    }
  };

  // Track anonymous hunt page views for creator engagement analytics.
  useEffect(() => {
    void (async () => {
      try {
        await fetch("/api/analytics/hunt-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ huntId: hunt.id }),
          keepalive: true,
        })
      } catch {
        // analytics failure should not affect the user experience
      }
    })()
  }, [hunt.id])

  const handleShare = async () => {
    const url = `${window.location.origin}/hunt/${hunt.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markHuntCancelled = (huntId: number) => {
    updateHuntStatus(huntId, "Cancelled");
  };

  const huntUrl = typeof window !== "undefined" ? `${window.location.origin}/hunt/${hunt.id}` : "";

  return (
    <div className="space-y-6">
      {/* Registration Section */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Registration Button - Requirements 1.2, 2.1 */}
        {connectedPublicKey ? (
          <div className="flex-1 w-full">
            <RegistrationButton
              huntId={hunt.id}
              playerAddress={connectedPublicKey}
              registrationStatus={registrationStatus}
              onRegister={handleRegister}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row items-stretch gap-4 w-full">
            <div className="flex-1 flex items-center justify-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold text-base px-8 py-4 rounded-2xl">
              Please connect your wallet to join this hunt
            </div>
            <Button
              variant="outline"
              className="flex-1 border-[#3737A4] text-white hover:bg-[#3737A4]/20 py-4 h-auto font-semibold text-base rounded-2xl"
              onClick={() => router.push(`/hunt/${hunt.id}/leaderboard`)}
            >
              <Trophy className="w-5 h-5 mr-2" />
              Watch Live Leaderboard
            </Button>
          </div>
        )}

        {/* Share button */}

        <div className="flex gap-2">
          <Button onClick={handleShare}>
            {copied ? (
              <>
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQrOpen(true)}
            title="Show QR Code"
            aria-label="Show QR code for this hunt"
          >
            <QrCode className="w-4 h-4" />
          </Button>
        </div>
  <QrCodeModal open={qrOpen} onClose={() => setQrOpen(false)} url={huntUrl} />

        <HuntControls
          hunt={hunt}
          connectedPublicKey={connectedPublicKey}
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onCancelled={(huntId, txHash) => {
            markHuntCancelled(huntId)
            router.push("/hunts")
          }}
        />
      </div>

      {/* Play Interface Section - Protected by PlayInterfaceGuard (Requirements 3.1, 3.2, 3.3) */}
      {connectedPublicKey && (
        <PlayInterfaceGuard
          huntId={hunt.id}
          playerAddress={connectedPublicKey}
          onRegister={handleRegister}
        >
          <div className="mt-8">
            <PlayGame
              hunts={[]} // PlayGame will fetch clues itself using huntId
              gameName={hunt.title}
              onExit={() => router.push("/")}
              onGameComplete={async (score) => {
                // Refresh registration status to show completion/rewards
                clearRegistrationCache(hunt.id, connectedPublicKey);
                queryClient.invalidateQueries({ queryKey: ["registrationStatus", hunt.id, connectedPublicKey] });
                const payout = hunt.rewardType === "NFT"
                  ? null
                  : await withTransactionToast(
                      async (setStage) => {
                        setStage("approving");
                        return distributeCompletionReward(hunt.id, connectedPublicKey);
                      },
                      {
                        pending: "Pending - preparing reward distribution...",
                        approving: "Approving - sign the reward receipt in your wallet...",
                        confirmed: "Reward distributed!",
                      }
                    );
                setCompletionScore(payout?.amount ?? score);
                setRewardReceipt(payout?.receipt ?? null);
                setIsCompleteModalOpen(true);
              }}
              huntId={hunt.id}
              playerAddress={connectedPublicKey}
            />
          </div>
          
          <GameCompleteModal
            isOpen={isCompleteModalOpen}
            onClose={() => setIsCompleteModalOpen(false)}
            onGoHome={() => router.push("/")}
            onReplay={() => {
              setIsCompleteModalOpen(false);
              // PlayGame handles internal reset or we can refetch
            }}
            onViewLeaderboard={() => router.push(`/?huntId=${hunt.id}&tab=leaderboard`)}
            reward={completionScore}
            rewardReceipt={rewardReceipt}
            huntId={hunt.id}
            playerAddress={connectedPublicKey}
          />
        </PlayInterfaceGuard>
      )}
    </div>
  );
}
