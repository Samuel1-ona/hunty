"use client"

/**
 * PushNotificationToggle
 *
 * Self-contained component that lets users opt in / out of Web Push
 * notifications. Surfaces the current permission state and provides clear
 * feedback when the browser blocks notifications.
 */

import React from "react"
import { Bell, BellOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import { cn } from "@/lib/utils"

interface PushNotificationToggleProps {
  walletAddress: string | null
  className?: string
}

export function PushNotificationToggle({
  walletAddress,
  className,
}: PushNotificationToggleProps) {
  const { state, isSupported, isSubscribed, enable, disable, error } =
    usePushNotifications(walletAddress)

  if (!isSupported) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500",
          className
        )}
      >
        <BellOff className="w-4 h-4 shrink-0" />
        <span>Push notifications are not supported by this browser.</span>
      </div>
    )
  }

  const isLoading = state === "checking" || state === "loading"
  const isDenied = state === "denied"

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="w-4 h-4 text-[#3737A4] dark:text-indigo-400 shrink-0" />
          ) : (
            <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">
              Browser Push Notifications
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
              {isSubscribed
                ? "Receiving push notifications on this device"
                : isDenied
                ? "Permission blocked — update in browser settings"
                : "Get notified even when the tab is closed"}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={isSubscribed ? disable : enable}
          disabled={isLoading || isDenied || !walletAddress}
          role="switch"
          aria-checked={isSubscribed}
          aria-label={isSubscribed ? "Disable push notifications" : "Enable push notifications"}
          className={cn(
            "relative w-10 h-5 rounded-full transition-colors shrink-0 ml-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3737A4]",
            isSubscribed
              ? "bg-[#3737A4]"
              : isDenied
              ? "bg-slate-200 dark:bg-slate-700 cursor-not-allowed"
              : "bg-slate-300 dark:bg-slate-600",
            isLoading && "opacity-60 cursor-wait",
            !walletAddress && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="absolute top-0.5 left-0.5 w-4 h-4 text-white animate-spin" />
          ) : (
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                isSubscribed && "translate-x-5"
              )}
            />
          )}
        </button>
      </div>

      {/* Status indicators */}
      {isSubscribed && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 pl-6">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Push notifications active on this device</span>
        </div>
      )}

      {isDenied && (
        <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 pl-6">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Open browser settings → Site permissions → Notifications and allow
            Hunty to send notifications.
          </span>
        </div>
      )}

      {!walletAddress && !isDenied && (
        <p className="text-xs text-slate-400 dark:text-slate-500 pl-6">
          Connect your wallet to enable push notifications.
        </p>
      )}

      {error && !isDenied && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 pl-6">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
