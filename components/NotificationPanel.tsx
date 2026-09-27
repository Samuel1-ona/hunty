"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Bell, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getStoredNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications/rankTracker"
import type { LeaderboardRankNotification } from "@/lib/notifications/types"

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
}

function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getNotificationIcon(type: LeaderboardRankNotification["type"]) {
  switch (type) {
    case "rank_improved":
      return <ChevronUp className="w-4 h-4 text-green-500" />
    case "rank_dropped":
      return <ChevronDown className="w-4 h-4 text-red-500" />
    case "overtaken":
      return <Users className="w-4 h-4 text-orange-500" />
  }
}

function getNotificationTitle(notification: LeaderboardRankNotification): string {
  switch (notification.type) {
    case "rank_improved":
      return `Rank improved! #${notification.previousRank} → #${notification.currentRank}`
    case "rank_dropped":
      return `Rank dropped #${notification.previousRank} → #${notification.currentRank}`
    case "overtaken":
      return `Overtaken by ${notification.overtakenBy || "another player"}`
  }
}

function getNotificationDescription(notification: LeaderboardRankNotification): string {
  const hunt = notification.huntTitle || `Hunt #${notification.huntId}`
  switch (notification.type) {
    case "rank_improved":
      return `You moved up in "${hunt}"`
    case "rank_dropped":
      return `You moved down in "${hunt}"`
    case "overtaken":
      return `In "${hunt}" — now at #${notification.currentRank}`
  }
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<LeaderboardRankNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(() => {
    setNotifications(getStoredNotifications())
    setUnreadCount(getUnreadNotificationCount())
  }, [])

  useEffect(() => {
    if (open) {
      refresh()
    }
  }, [open, refresh])

  const handleMarkRead = (id: string) => {
    markNotificationRead(id)
    refresh()
  }

  const handleMarkAllRead = () => {
    markAllNotificationsRead()
    refresh()
  }

  const handleClearAll = () => {
    clearNotifications()
    refresh()
  }

  if (!open) return null

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-xl z-50 overflow-hidden backdrop-blur-xl">
      <div className="px-4 py-3 bg-gradient-to-r from-[#0C0C4F] to-[#4A4AFF] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close notifications"
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Rank changes will appear here
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 px-3 py-2 border-b border-slate-100 dark:border-white/5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-[#3737A4] dark:text-blue-400 hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="text-xs text-red-500 hover:underline ml-auto"
              >
                Clear all
              </button>
            </div>
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleMarkRead(n.id)}
                className={cn(
                  "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 border-b border-slate-100 dark:border-white/5",
                  !n.read && "bg-blue-50/50 dark:bg-blue-900/10"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {getNotificationIcon(n.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "text-sm truncate",
                    !n.read ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {getNotificationTitle(n)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {getNotificationDescription(n)}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                  {formatTimestamp(n.timestamp)}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
