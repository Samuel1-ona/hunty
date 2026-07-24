"use client"

import React, { useState, useEffect } from "react"
import { Bell, BellOff, ChevronUp, ChevronDown, Users, Calendar } from "lucide-react"
import { getNotificationPreferences, setNotificationPreferences } from "@/lib/notifications/notificationPreferences"
import type { NotificationPreferences } from "@/lib/notifications/types"

interface NotificationSettingsProps {
  onClose?: () => void
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPreferences())

  useEffect(() => {
    setNotificationPreferences(prefs)
  }, [prefs])

  const toggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] as boolean }))
  }

  const setThreshold = (value: number) => {
    setPrefs((prev) => ({ ...prev, threshold: Math.max(1, value) }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {prefs.enabled ? (
            <Bell className="w-4 h-4 text-[#3737A4]" />
          ) : (
            <BellOff className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Push Notifications
          </span>
        </div>
        <button
          onClick={() => toggle("enabled")}
          role="switch"
          aria-checked={prefs.enabled}
          className={cn(
            "relative w-10 h-5 rounded-full transition-colors",
            prefs.enabled ? "bg-[#3737A4]" : "bg-slate-300 dark:bg-slate-600"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
              prefs.enabled && "translate-x-5"
            )}
          />
        </button>
      </div>

      {prefs.enabled && (
        <>
          <div className="space-y-3 pl-2">
            <ToggleRow
              icon={<ChevronUp className="w-4 h-4 text-green-500" />}
              label="Rank improvement"
              description="When you move up in rank"
              checked={prefs.rankImproved}
              onChange={() => toggle("rankImproved")}
            />
            <ToggleRow
              icon={<ChevronDown className="w-4 h-4 text-red-500" />}
              label="Rank drop"
              description="When you move down in rank"
              checked={prefs.rankDropped}
              onChange={() => toggle("rankDropped")}
            />
            <ToggleRow
              icon={<Users className="w-4 h-4 text-orange-500" />}
              label="Overtaken"
              description="When another player overtakes you"
              checked={prefs.overtaken}
              onChange={() => toggle("overtaken")}
            />
            <ToggleRow
              icon={<Calendar className="w-4 h-4 text-purple-500" />}
              label="Weekly digest"
              description="Weekly rank summary"
              checked={prefs.weeklyDigest}
              onChange={() => toggle("weeklyDigest")}
            />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Minimum rank change threshold: {prefs.threshold}
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Only notify when rank changes by at least this many positions
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5, 10].map((v) => (
                <button
                  key={v}
                  onClick={() => setThreshold(v)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm transition-colors",
                    prefs.threshold === v
                      ? "bg-[#3737A4] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {v === 1 ? "Any" : `+${v}`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        className={cn(
          "relative w-9 h-4 rounded-full transition-colors shrink-0 ml-2",
          checked ? "bg-[#3737A4]" : "bg-slate-300 dark:bg-slate-600"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </div>
  )
}

function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(" ")
}
