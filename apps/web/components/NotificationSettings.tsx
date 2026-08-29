"use client";

import {
  Bell,
  BellOff,
  Calendar,
  ChevronDown,
  ChevronUp,
  Flag,
  Gift,
  Trophy,
  Users,
} from "lucide-react";
import React, { useContext, useEffect, useState } from "react";

import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { WalletContext } from "@/lib/context/WalletContext";
import {
  fetchNotificationPreferences,
  getNotificationPreferences,
  setNotificationPreferences,
  syncNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";
import type { NotificationPreferences } from "@/lib/notifications/types";
import { syncPreferencesToServer } from "@/lib/notifications/webPush";

interface NotificationSettingsProps {
  onClose?: () => void;
  /** Optional override, useful when this component is embedded elsewhere. */
  walletAddress?: string | null;
}

type BooleanPreferenceKey = {
  [Key in keyof NotificationPreferences]: NotificationPreferences[Key] extends boolean
    ? Key
    : never;
}[keyof NotificationPreferences];

export function NotificationSettings({ walletAddress = null }: NotificationSettingsProps) {
  const wallet = useContext(WalletContext);
  const connectedWallet = walletAddress ?? wallet?.publicKey ?? null;
  const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPreferences());
  const [hydrated, setHydrated] = useState(false);

  // The local copy renders immediately, then the wallet-scoped server copy wins
  // once it arrives. This gives offline users a useful settings screen while
  // still making a connected wallet's settings portable across devices.
  useEffect(() => {
    let cancelled = false;

    if (!connectedWallet) {
      setHydrated(true);
      return () => {
        cancelled = true;
      };
    }

    setHydrated(false);
    void fetchNotificationPreferences(connectedWallet).then((serverPrefs) => {
      if (cancelled) return;
      if (serverPrefs) setPrefs(serverPrefs);
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [connectedWallet]);

  // Persist locally and debounce the network write so rapid switch changes do
  // not race each other. The API merges the complete normalized document by
  // wallet, so the latest document is what every device reads.
  useEffect(() => {
    if (!hydrated) return;

    setNotificationPreferences(prefs);
    if (!connectedWallet) return;

    const timeout = window.setTimeout(() => {
      // The browser-push toggle owns its own state, so read the latest local
      // document here rather than relying only on this component's render.
      const latest = getNotificationPreferences();
      void syncNotificationPreferences(connectedWallet, latest);

      // Web Push has its own subscription record because delivery happens
      // without a page open. The helper no-ops if push is not subscribed.
      void syncPreferencesToServer(connectedWallet, {
        enabled: latest.enabled,
        huntEvents: latest.huntEvents,
        rewards: latest.rewards,
        social: latest.social,
        achievements: latest.achievements,
        huntStart: latest.pushHuntStart,
        overtake: latest.pushOvertake,
        huntCancelled: latest.pushHuntCancelled,
        playerRegistered: latest.pushPlayerRegistered,
        firstCompletion: latest.pushFirstCompletion,
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [connectedWallet, hydrated, prefs]);

  const toggle = (key: BooleanPreferenceKey) => {
    setPrefs((previous) => {
      // PushNotificationToggle also persists its flag locally. Preserve that
      // child-owned value when another switch causes this component to render.
      const latestPushEnabled = getNotificationPreferences().pushEnabled;
      return {
        ...previous,
        pushEnabled: latestPushEnabled,
        [key]: !previous[key],
      };
    });
  };

  const setThreshold = (value: number) => {
    setPrefs((previous) => ({ ...previous, threshold: Math.max(1, value) }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {prefs.enabled ? (
            <Bell className="h-4 w-4 text-[#3737A4]" />
          ) : (
            <BellOff className="h-4 w-4 text-slate-400" />
          )}
          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Notifications
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {prefs.enabled
                ? "Choose what Hunty can notify you about"
                : "All notifications are muted"}
            </p>
          </div>
        </div>
        <Switch
          checked={prefs.enabled}
          onChange={() => toggle("enabled")}
          label="Mute all notifications"
        />
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Notification categories
        </p>
        <ToggleRow
          icon={<Flag className="h-4 w-4 text-purple-500" />}
          label="Hunt events"
          description="Starts, reminders and cancellations"
          checked={prefs.enabled && prefs.huntEvents}
          onChange={() => toggle("huntEvents")}
        />
        <ToggleRow
          icon={<Gift className="h-4 w-4 text-pink-500" />}
          label="Rewards & progress"
          description="Rewards and correct answers"
          checked={prefs.enabled && prefs.rewards}
          onChange={() => toggle("rewards")}
        />
        <ToggleRow
          icon={<Users className="h-4 w-4 text-orange-500" />}
          label="Social & competition"
          description="Leaderboard activity and rank changes"
          checked={prefs.enabled && prefs.social}
          onChange={() => toggle("social")}
        />
        <ToggleRow
          icon={<Trophy className="h-4 w-4 text-amber-500" />}
          label="Achievements"
          description="When you unlock an achievement"
          checked={prefs.enabled && prefs.achievements}
          onChange={() => toggle("achievements")}
        />
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Rank detail
        </p>
        <ToggleRow
          icon={<ChevronUp className="h-4 w-4 text-green-500" />}
          label="Rank improvement"
          description="When you move up in rank"
          checked={prefs.enabled && prefs.social && prefs.rankImproved}
          onChange={() => toggle("rankImproved")}
        />
        <ToggleRow
          icon={<ChevronDown className="h-4 w-4 text-red-500" />}
          label="Rank drop"
          description="When you move down in rank"
          checked={prefs.enabled && prefs.social && prefs.rankDropped}
          onChange={() => toggle("rankDropped")}
        />
        <ToggleRow
          icon={<Users className="h-4 w-4 text-orange-500" />}
          label="Overtaken"
          description="When another player overtakes you"
          checked={prefs.enabled && prefs.social && prefs.overtaken}
          onChange={() => toggle("overtaken")}
        />
        <ToggleRow
          icon={<Calendar className="h-4 w-4 text-purple-500" />}
          label="Weekly digest"
          description="Weekly rank summary"
          checked={prefs.enabled && prefs.social && prefs.weeklyDigest}
          onChange={() => toggle("weeklyDigest")}
        />
      </div>

      <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Minimum rank change threshold: {prefs.threshold}
        </label>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Only notify when rank changes by at least this many positions
        </p>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 5, 10].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setThreshold(value)}
              className={cn(
                "rounded-lg px-3 py-1 text-sm transition-colors",
                prefs.threshold === value
                  ? "bg-[#3737A4] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              )}
            >
              {value === 1 ? "Any" : `+${value}`}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
        <PushNotificationToggle walletAddress={connectedWallet} />
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-label={label}
      aria-checked={checked}
      className={cn(
        "relative h-5 w-10 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3737A4]",
        checked ? "bg-[#3737A4]" : "bg-slate-300 dark:bg-slate-600"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-700 dark:text-slate-300">{label}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onChange={onChange} label={`Toggle ${label}`} />
    </div>
  );
}

function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(" ");
}
