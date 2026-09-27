"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCheckmark } from "@/components/AnimatedCheckmark";
import type { RegistrationStatus } from "@/lib/types";

interface RegistrationButtonProps {
  huntId: number;
  playerAddress: string;
  registrationStatus: RegistrationStatus;
  onRegister: () => Promise<void>;
}

export function RegistrationButton({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  huntId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  playerAddress,
  registrationStatus,
  onRegister,
}: RegistrationButtonProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleRegister = async () => {
    setIsRegistering(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onRegister();
      setSuccessMessage("Successfully registered for the hunt!");
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(errorMessage);
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsRegistering(false);
    }
  };

  // Show loading state during initial status check
  if (registrationStatus.loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <Skeleton className="h-4 w-2/3 mx-auto bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  // Show error from status check with helpful context
  if (registrationStatus.error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm font-medium text-red-800 mb-1">Unable to check registration</p>
        <p className="text-sm text-red-700">{registrationStatus.error}</p>
        {registrationStatus.error.includes("wallet") && (
          <p className="text-xs text-red-600 mt-2">
            Make sure you have a Soroban-compatible wallet installed and connected.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Registration button */}
      {registrationStatus.isRegistered ? (
        <button
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 active:scale-95 transition-all duration-150 text-white font-semibold text-base px-8 py-4 rounded-2xl shadow-lg shadow-green-900/40"
          disabled={isRegistering}
        >
          <AnimatedCheckmark asCircle className="text-green-600" size={20} />
          Continue Hunt
        </button>
      ) : (
        <button
          onClick={handleRegister}
          disabled={isRegistering}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all duration-150 text-white font-semibold text-base px-8 py-4 rounded-2xl shadow-lg shadow-violet-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegistering ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Registering...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Join Hunt
            </>
          )}
        </button>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error message with retry capability (Requirement 4.4) */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 mb-1">Registration failed</p>
              <p className="text-sm text-red-700">{error}</p>
              {retryCount > 0 && (
                <p className="text-xs text-red-600 mt-2">
                  {retryCount === 1 ? "1 attempt made." : `${retryCount} attempts made.`} You can try again.
                </p>
              )}
              {error.includes("network") && (
                <p className="text-xs text-red-600 mt-2">
                  Please check your internet connection and try again.
                </p>
              )}
              {error.includes("wallet") && (
                <p className="text-xs text-red-600 mt-2">
                  Make sure your wallet is connected and unlocked.
                </p>
              )}
              {error.includes("cancelled") && (
                <p className="text-xs text-red-600 mt-2">
                  Click the button again when you&apos;re ready to complete the registration.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
