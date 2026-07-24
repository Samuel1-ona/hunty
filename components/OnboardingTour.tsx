"use client";

import React, { useEffect, useState, useMemo } from "react";
import Joyride, { Step, CallBackProps, STATUS, TooltipRenderProps } from "react-joyride";
import { useWallet } from "@/lib/context/WalletContext";
import { X } from "lucide-react";

interface OnboardingTourProps {
  tourType: "player" | "creator";
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ tourType }) => {
  const { publicKey } = useWallet();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Generate storage key dynamically based on user context
  const storageKey = useMemo(() => {
    return `hasSeenTour_${tourType}_${publicKey || "guest"}`;
  }, [tourType, publicKey]);

  useEffect(() => {
    // Check if the user has already opted out or completed the tour
    const hasSeenTour = localStorage.getItem(storageKey);
    if (!hasSeenTour) {
      setRun(true);
      setStepIndex(0);
    } else {
      setRun(false);
    }
  }, [storageKey]);

  useEffect(() => {
    const handleStartTour = (e: Event) => {
      const customEvent = e as CustomEvent<{ tourType: string }>;
      if (customEvent.detail?.tourType === tourType) {
        setStepIndex(0);
        setRun(true);
      }
    };
    window.addEventListener("start-onboarding-tour", handleStartTour);
    return () => {
      window.removeEventListener("start-onboarding-tour", handleStartTour);
    };
  }, [tourType]);

  const playerSteps: Step[] = [
    {
      target: "body",
      placement: "center",
      title: "Welcome to Hunty! 🎯",
      content: "Hunty is a decentralized Web3 scavenger hunt platform. Browse active challenges, solve clues, and unlock real crypto rewards and exclusive NFTs!",
      disableBeacon: true,
    },
    {
      target: "#wallet-button",
      placement: "bottom",
      title: "Connect Your Wallet 🔑",
      content: "Connect your Stellar wallet to build your profile, start solving clues, and automatically claim your earnings.",
      disableBeacon: true,
    },
    {
      target: "#play-button",
      placement: "bottom",
      title: "Play Active Hunts 🎮",
      content: "If you have a game link, paste it in the field below or click 'Play Game' to start solving active hunts immediately.",
      disableBeacon: true,
    },
    {
      target: "#discovery-arcade",
      placement: "top",
      title: "Explore the Discovery Arcade 🗺️",
      content: "Browse the arcade of live and completed hunts. Filter by reward types (XLM, NFTs) or search for specific hunts by name or creator.",
      disableBeacon: true,
    },
    {
      target: "#balance-pill",
      placement: "bottom",
      title: "Track Your Earnings 💰",
      content: "Your current Stellar balance is updated in real-time right here in the header once connected.",
      disableBeacon: true,
    },
  ];

  const creatorSteps: Step[] = [
    {
      target: "body",
      placement: "center",
      title: "Creator Dashboard 🛠️",
      content: "Welcome to the Creator Workspace. Here you can design, deploy, and fund your custom scavenger hunts, and monitor player engagement.",
      disableBeacon: true,
    },
    {
      target: "#creator-create-button",
      placement: "bottom",
      title: "Create a Scavenger Hunt 📝",
      content: "Design clues, hints, upload cover images, configure rules, and lock rewards (XLM/NFTs) inside a Soroban smart contract.",
      disableBeacon: true,
    },
    {
      target: "#creator-templates-button",
      placement: "bottom",
      title: "Start from a Template 📑",
      content: "Use our pre-made scavenger hunt templates to quickly launch local, educational, or virtual challenges.",
      disableBeacon: true,
    },
    {
      target: "#reward-history-section",
      placement: "top",
      title: "Reward Distributions 💸",
      content: "Check transaction history, see who claimed rewards, and view public explorer links for your hunt transactions on the Stellar ledger.",
      disableBeacon: true,
    },
  ];

  const rawSteps = tourType === "player" ? playerSteps : creatorSteps;

  // Dynamically filter steps based on presence of targets in DOM
  const steps = useMemo(() => {
    if (typeof window === "undefined") return [];
    return rawSteps.filter((step) => {
      if (step.target === "body") return true;
      if (typeof step.target === "string") {
        const el = document.querySelector(step.target);
        return !!el;
      }
      return true;
    });
  }, [rawSteps]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index } = data;

    if (action === "close") {
      setRun(false);
      if (dontShowAgain) {
        localStorage.setItem(storageKey, "true");
      }
    } else if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      setRun(false);
      // Mark tour as seen when completed or skipped, or if explicit opt-out is checked
      if (dontShowAgain || status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        localStorage.setItem(storageKey, "true");
      }
    } else {
      setStepIndex(index);
    }
  };

  // Custom styled Tooltip Component
  const TourTooltip = ({
    continuous,
    index,
    isLastStep,
    size,
    step,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
  }: TooltipRenderProps) => {
    return (
      <div
        {...tooltipProps}
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-[340px] text-slate-900 dark:text-white relative animate-in zoom-in-95 duration-200"
      >
        {/* Top row: step count / close */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Step {index + 1} of {size}
          </span>
          <button
            {...closeProps}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        {step.title && (
          <h3 className="text-base font-bold bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] dark:from-indigo-400 dark:to-purple-400 text-transparent bg-clip-text mb-2">
            {step.title}
          </h3>
        )}

        {/* Content */}
        <div className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
          {step.content}
        </div>

        {/* Bottom row: checkbox + actions */}
        <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
          {/* Do not show again checkbox */}
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-[#3737A4] focus:ring-[#3737A4] w-3.5 h-3.5"
            />
            <span>Don't show this tour again</span>
          </label>

          <div className="flex items-center justify-between gap-2">
            {/* Skip button (only show if continuous and not on the last step) */}
            {continuous && !isLastStep ? (
              <button
                {...skipProps}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Skip Tour
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              {/* Back button */}
              {index > 0 && (
                <button
                  {...backProps}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
              )}

              {/* Next or Finish button */}
              <button
                {...primaryProps}
                className="px-4 py-1.5 bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] dark:from-indigo-600 dark:to-indigo-800 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
              >
                {isLastStep ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      run={run}
      stepIndex={stepIndex}
      scrollToFirstStep
      steps={steps}
      tooltipComponent={TourTooltip}
      styles={{
        options: {
          arrowColor: "transparent",
          overlayColor: "rgba(12, 12, 79, 0.4)",
          zIndex: 1000,
        },
        spotlight: {
          borderRadius: 16,
        },
      }}
    />
  );
};

export default OnboardingTour;
