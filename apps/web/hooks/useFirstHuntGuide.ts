"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useWallet } from "@/lib/context/WalletContext";
import {
  applyKnownFirstHuntProgress,
  dismissFirstHuntGuide,
  FIRST_HUNT_GUIDE_EVENT,
  getDefaultFirstHuntGuideState,
  getFirstHuntProgress,
  hydrateFirstHuntGuide,
  loadFirstHuntGuideState,
  markFirstHuntStep,
  restoreFirstHuntGuide,
  setFirstHuntGuideCollapsed,
  type FirstHuntGuideState,
  type FirstHuntProgress,
  type FirstHuntStepId,
} from "@/lib/firstHuntGuide";

export interface UseFirstHuntGuideResult {
  state: FirstHuntGuideState;
  progress: FirstHuntProgress;
  isReady: boolean;
  isVisible: boolean;
  markStep: (step: FirstHuntStepId, huntId?: number) => void;
  dismiss: () => void;
  restore: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export function useFirstHuntGuide(): UseFirstHuntGuideResult {
  const { connected, publicKey } = useWallet();
  const [state, setState] = useState<FirstHuntGuideState>(getDefaultFirstHuntGuideState);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const next = hydrateFirstHuntGuide(publicKey || undefined);
    setState(next);
    setIsReady(true);
  }, [publicKey]);

  useEffect(() => {
    if (!connected) return;
    setState(applyKnownFirstHuntProgress({ connected: true }));
  }, [connected]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleChange = (event: Event) => {
      const custom = event as CustomEvent<FirstHuntGuideState>;
      if (custom.detail) {
        setState(custom.detail);
        return;
      }
      setState(loadFirstHuntGuideState());
    };

    window.addEventListener(FIRST_HUNT_GUIDE_EVENT, handleChange);
    return () => window.removeEventListener(FIRST_HUNT_GUIDE_EVENT, handleChange);
  }, []);

  const markStep = useCallback((step: FirstHuntStepId, huntId?: number) => {
    setState(markFirstHuntStep(step, huntId != null ? { huntId } : undefined));
  }, []);

  const dismiss = useCallback(() => {
    setState(dismissFirstHuntGuide());
  }, []);

  const restore = useCallback(() => {
    setState(restoreFirstHuntGuide());
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setState(setFirstHuntGuideCollapsed(collapsed));
  }, []);

  const progress = useMemo(() => getFirstHuntProgress(state), [state]);

  return {
    state,
    progress,
    isReady,
    isVisible: isReady && !state.dismissed,
    markStep,
    dismiss,
    restore,
    setCollapsed,
  };
}
