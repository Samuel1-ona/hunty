"use client";

import { useQueryClient } from "@tanstack/react-query";
import { QrCode, Trophy } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ChatWindow } from "@/components/ChatWindow";
import { EmbedModal } from "@/components/EmbedModal";
import { GameCompleteModal } from "@/components/GameCompleteModal";
import { HuntControls } from "@/components/HuntControls";
import { HuntReviewsSection } from "@/components/HuntReviewsSection";
import { PlayGame } from "@/components/PlayGame";
import { PlayInterfaceGuard } from "@/components/PlayInterfaceGuard";
import { PrivateHuntAccessGate } from "@/components/PrivateHuntAccessGate";
import { QrCodeModal } from "@/components/QrCodeModal";
import { RegistrationButton } from "@/components/RegistrationButton";
import { SponsorHuntButton } from "@/components/SponsorHuntButton";
import { Button } from "@/components/ui/button";
import { WaitlistDisplay } from "@/components/WaitlistDisplay";
import {
  checkRegistrationStatus,
  clearRegistrationCache,
  isWalletAvailable,
  registerPlayer,
} from "@/lib/contracts/player-registration";
import { distributeCompletionReward } from "@/lib/contracts/rewardManager";
import { debounce } from "@/lib/debounce";
import {
  buildDeepLink,
  buildHuntOgImageUrl,
  copyShareLink,
  shareOnTelegram,
  shareOnTwitter,
  shareOnWhatsApp,
} from "@/lib/downloadAsImage";
import { prepareHuntReattempt } from "@/lib/huntAttemptHistory";
import {
  getHuntById,
  updateHuntStatus,
  validateHuntInvite,
} from "@/lib/huntStore";
import { getHuntCapacity, getRemainingSpots } from "@/lib/huntStore";
import { REGISTRATION_STATUS_DEBOUNCE_MS } from "@/lib/soroban/queryConfig";
import { withTransactionToast } from "@/lib/txToast";
import type {
  HuntRegistrationStatus,
  RewardReceipt,
  StoredHunt,
} from "@/lib/types";
import { addToWaitlist, getWaitlistPosition } from "@/lib/waitlist";

interface HuntDetailProps {
  hunt: StoredHunt;
}

export default function HuntShare({ hunt }: HuntDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const inviteAccess = validateHuntInvite(hunt, inviteToken);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);
  const [rewardReceipt, setRewardReceipt] = useState<RewardReceipt | null>(null);
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [connectedPublicKey, setConnectedPublicKey] = useState<string | undefined>(undefined);
  const [walletCheckComplete, setWalletCheckComplete] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<HuntRegistrationStatus>({
    isRegistered: false,
    isWaitlisted: false,
    loading: true,
  });
  const [qrOpen, setQrOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);

  // Get current players (using stored hunt's playerCount, defaulting to 0)
  const currentPlayers = hunt.playerCount ?? 0;
  const maxCapacity = getHuntCapacity(hunt);
  const remainingSpots = getRemainingSpots(hunt);

  useEffect(() => {
    if (searchParams.get("reattempt") !== "1" || !connectedPublicKey) return;
    prepareHuntReattempt(connectedPublicKey, hunt.id);
  }, [connectedPublicKey, hunt.id, searchParams]);
  
  /* eslint-disable react-hooks/set-state-in-effect -- wallet detection synchronizes React with an external browser extension. */
  useEffect(() => {
    // Check if wallet is available
    if (!isWalletAvailable()) {
      setWalletCheckComplete(true);
      setRegistrationStatus({
        isRegistered: false,
        isWaitlisted: false,
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
            isWaitlisted: false,
            loading: false,
            error: "Please connect your wallet to continue",
          });
        });
    } else {
      setWalletCheckComplete(true);
      setRegistrationStatus({
        isRegistered: false,
        isWaitlisted: false,
        loading: false,
        error: "Please connect your wallet to continue",
      });
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const refreshRegistrationStatus = useCallback(async (isActive: () => boolean = () => true) => {
    if (!walletCheckComplete || !isActive()) {
      return;
    }

    if (!connectedPublicKey) {
      if (isActive()) {
        setRegistrationStatus({
          isRegistered: false,
          isWaitlisted: false,
          loading: false,
          error: "Please connect your wallet to continue",
        });
      }
      return;
    }

    // Set loading state
    setRegistrationStatus({
      isRegistered: false,
      isWaitlisted: false,
      loading: true,
    });

    // Check registration status
    const status = await checkRegistrationStatus(hunt.id, connectedPublicKey);
    
    // Also check waitlist position
    const waitlistPosition = getWaitlistPosition(hunt.id, connectedPublicKey);

    if (isActive()) {
      setRegistrationStatus({
        ...status,
        isWaitlisted: waitlistPosition !== null,
        waitlistPosition: waitlistPosition ?? undefined,
      });
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

  const assertCurrentInviteAccess = () => {
    const latestHunt = getHuntById(hunt.id) ?? hunt;
    const access = validateHuntInvite(latestHunt, inviteToken);

    if (!access.isValid) {
      const message = access.reason === "expired"
        ? "Access denied. This invite link has expired."
        : "Access denied. This invite link is invalid or has been revoked.";
      throw new Error(message);
    }
  };

  // Handle player registration (Requirements 1.3, 1.4, 1.5)
  const handleRegister = async () => {
    if (!connectedPublicKey) {
      return;
    }

    assertCurrentInviteAccess();
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

  // Handle adding to waitlist
  const handleWaitlist = async () => {
    if (!connectedPublicKey) {
      return;
    }

    assertCurrentInviteAccess();
    addToWaitlist(hunt.id, connectedPublicKey, `${connectedPublicKey.slice(0, 6)}...${connectedPublicKey.slice(-4)}`);
    await refreshRegistrationStatus();
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
    const url = buildDeepLink(`/hunt/${hunt.id}`)
    const copiedNow = await copyShareLink(url)
    if (copiedNow) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  };

  const shareText = `Join me on \"${hunt.title}\" in Hunty and crack the clues!`

  const handleShareToX = () => {
    const url = buildDeepLink(`/hunt/${hunt.id}`)
    shareOnTwitter(shareText, url, buildHuntOgImageUrl(hunt.id))
  }

  const handleShareToTelegram = () => {
    const url = buildDeepLink(`/hunt/${hunt.id}`)
    shareOnTelegram(shareText, url)
  }

  const handleShareToWhatsApp = () => {
    const url = buildDeepLink(`/hunt/${hunt.id}`)
    shareOnWhatsApp(shareText, url)
  }

  const markHuntCancelled = (huntId: number) => {
    updateHuntStatus(huntId, "Cancelled");
  };

  const huntUrl = typeof window !== "undefined" ? `${window.location.origin}/hunt/${hunt.id}` : "";

  return (
    <div className="space-y-6">
      {/* Registration Section */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Registration Button - Requirements 1.2, 2.1 */}
        <PrivateHuntAccessGate hunt={hunt} inviteToken={inviteToken}>
          {connectedPublicKey ? (
            <div className="flex-1 w-full space-y-4">
              <RegistrationButton
                huntId={hunt.id}
                playerAddress={connectedPublicKey}
                registrationStatus={registrationStatus}
                onRegister={handleRegister}
                onWaitlist={handleWaitlist}
                maxCapacity={maxCapacity}
                currentPlayers={currentPlayers}
              />
              {/* Waitlist/Spot Display */}
              {maxCapacity !== undefined && (
                <WaitlistDisplay
                  huntId={hunt.id}
                  currentPlayers={currentPlayers}
                  maxCapacity={maxCapacity}
                  playerAddress={connectedPublicKey}
                />
              )}
              {maxCapacity !== undefined && remainingSpots !== undefined && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {remainingSpots} of {maxCapacity} spots left
                </div>
              )}
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
        </PrivateHuntAccessGate>

        {/* Share button */}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShareToX} aria-label="Share hunt to X">
              Share X
            </Button>
            <Button variant="outline" onClick={handleShareToTelegram} aria-label="Share hunt to Telegram">
              Telegram
            </Button>
            <Button variant="outline" onClick={handleShareToWhatsApp} aria-label="Share hunt to WhatsApp">
              WhatsApp
            </Button>
          </div>

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
          {!hunt.is_private && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setEmbedOpen(true)}
              title="Get embed code"
              aria-label="Get embed code for this hunt"
            >
              {/* Code2 icon inline to avoid an extra import collision */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m18 16 4-4-4-4" />
                <path d="m6 8-4 4 4 4" />
                <path d="m14.5 4-5 16" />
              </svg>
            </Button>
          )}
        </div>
        <QrCodeModal open={qrOpen} onClose={() => setQrOpen(false)} url={huntUrl} />
        {!hunt.is_private && (
          <EmbedModal
            hunt={hunt}
            open={embedOpen}
            onClose={() => setEmbedOpen(false)}
          />
        )}

        {hunt.rewardType !== "NFT" && (
          <SponsorHuntButton
            huntId={hunt.id}
            totalPool={hunt.rewardPool ?? 0}
          />
        )}

        <HuntControls
          hunt={hunt}
          connectedPublicKey={connectedPublicKey}
          onCancelled={(huntId, _txHash) => {
            markHuntCancelled(huntId)
            router.push("/hunts")
          }}
        />
      </div>

      {/* Play Interface Section - Protected by PlayInterfaceGuard (Requirements 3.1, 3.2, 3.3) */}
      {inviteAccess.isValid && connectedPublicKey && registrationStatus.isRegistered && (
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
              if (connectedPublicKey) {
                prepareHuntReattempt(connectedPublicKey, hunt.id);
              }
            }}
            onViewLeaderboard={() => router.push(`/?huntId=${hunt.id}&tab=leaderboard`)}
            reward={completionScore}
            rewardReceipt={rewardReceipt}
            huntId={hunt.id}
            playerAddress={connectedPublicKey}
          />
        </PlayInterfaceGuard>
      )}

      {/* Chat Window */}
      <ChatWindow 
        huntId={hunt.id} 
        currentUserAddress={connectedPublicKey} 
      />

      <div className="mt-12 pt-8 border-t border-white/10">
        <HuntReviewsSection huntId={hunt.id} creatorAddress={hunt.creator} />
      </div>
    </div>
  );
}



