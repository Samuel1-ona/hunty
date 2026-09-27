"use client";

import React, { useCallback, useEffect, useState } from "react";
import { checkRegistrationStatus } from "@/lib/contracts/player-registration";
import type { RegistrationStatus } from "@/lib/types";
import { RegistrationButton } from "@/components/RegistrationButton";
import { Skeleton } from "@/components/ui/skeleton";
import { debounce } from "@/lib/debounce";
import { REGISTRATION_STATUS_DEBOUNCE_MS } from "@/lib/soroban/queryConfig";

interface PlayInterfaceGuardProps {
  huntId: number;
  playerAddress: string;
  children: React.ReactNode;
  onRegister?: () => Promise<void>;
}

/**
 * PlayInterfaceGuard component prevents access to clues for unregistered players.
 * 
 * Behavior:
 * - Checks registration status before rendering children
 * - Displays registration prompt if player is not registered
 * - Renders play interface (children) only for registered players
 * - Automatically updates when registration status changes
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
export function PlayInterfaceGuard({
  huntId,
  playerAddress,
  children,
  onRegister,
}: PlayInterfaceGuardProps) {
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>({
    isRegistered: false,
    loading: true,
  });

  const refreshRegistrationStatus = useCallback(async (isActive: () => boolean = () => true) => {
    if (!isActive()) return;

    setRegistrationStatus({
      isRegistered: false,
      loading: true,
    });

    const status = await checkRegistrationStatus(huntId, playerAddress);

    if (isActive()) {
      setRegistrationStatus(status);
    }
  }, [huntId, playerAddress]);

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

  // Handle registration
  const handleRegister = async () => {
    if (onRegister) {
      await onRegister();
      // Refresh registration status after registration
      await refreshRegistrationStatus();
    } else {
      setRegistrationStatus({
        isRegistered: false,
        loading: true,
      });
      const status = await checkRegistrationStatus(huntId, playerAddress);
      setRegistrationStatus(status);
    }
  };

  // Show loading state while checking registration
  if (registrationStatus.loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto space-y-6 px-4">
        <div className="w-full space-y-3">
          <Skeleton className="h-8 w-3/4 mx-auto bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-4 w-full bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-4 w-5/6 mx-auto bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="w-full pt-4">
          <Skeleton className="h-12 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  // Show error state if status check failed
  if (registrationStatus.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 px-4">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 max-w-md">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-800 font-semibold mb-2">Unable to verify registration</p>
              <p className="text-red-700 text-sm mb-3">{registrationStatus.error}</p>
              {registrationStatus.error.includes("wallet") && (
                <p className="text-red-600 text-xs">
                  Please ensure your wallet is installed, connected, and unlocked.
                </p>
              )}
              {registrationStatus.error.includes("network") && (
                <p className="text-red-600 text-xs">
                  Please check your internet connection and refresh the page.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show registration prompt for unregistered players (Requirements 3.1, 3.2)
  if (!registrationStatus.isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 px-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Join This Hunt</h2>
          <p className="text-slate-600">
            You need to register for this hunt before you can access the clues and start playing.
          </p>
          <div className="pt-4">
            <RegistrationButton
              huntId={huntId}
              playerAddress={playerAddress}
              registrationStatus={registrationStatus}
              onRegister={handleRegister}
            />
          </div>
        </div>
      </div>
    );
  }

  // Render play interface for registered players (Requirement 3.3)
  return <>{children}</>;
}
