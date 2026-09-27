import { beforeEach, describe, expect, it } from "vitest"
import {
  getNotificationPreferences,
  setNotificationPreferences,
  shouldNotifyForRankChange,
} from "../notificationPreferences"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../types"

describe("notificationPreferences", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("getNotificationPreferences", () => {
    it("returns default preferences when nothing is stored", () => {
      const prefs = getNotificationPreferences()
      expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES)
    })

    it("merges stored preferences with defaults", () => {
      localStorage.setItem(
        "hunty_notification_prefs",
        JSON.stringify({ enabled: false })
      )
      const prefs = getNotificationPreferences()
      expect(prefs.enabled).toBe(false)
      expect(prefs.rankImproved).toBe(true)
      expect(prefs.threshold).toBe(1)
    })
  })

  describe("setNotificationPreferences", () => {
    it("persists preferences to localStorage", () => {
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, enabled: false })
      const stored = JSON.parse(localStorage.getItem("hunty_notification_prefs") || "{}")
      expect(stored.enabled).toBe(false)
    })
  })

  describe("shouldNotifyForRankChange", () => {
    it("returns true when all conditions are met", () => {
      expect(shouldNotifyForRankChange("rank_improved", 1)).toBe(true)
    })

    it("returns false when notifications are disabled", () => {
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, enabled: false })
      expect(shouldNotifyForRankChange("rank_improved", 1)).toBe(false)
    })

    it("returns false when change is below threshold", () => {
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, threshold: 5 })
      expect(shouldNotifyForRankChange("rank_improved", 1)).toBe(false)
    })

    it("returns false when rank improved notifications are disabled", () => {
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, rankImproved: false })
      expect(shouldNotifyForRankChange("rank_improved", 1)).toBe(false)
    })

    it("returns false when rank dropped notifications are disabled", () => {
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, rankDropped: false })
      expect(shouldNotifyForRankChange("rank_dropped", 1)).toBe(false)
    })

    it("returns false when overtaken notifications are disabled", () => {
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, overtaken: false })
      expect(shouldNotifyForRankChange("overtaken", 1)).toBe(false)
    })

    it("returns false for unknown notification type", () => {
      expect(shouldNotifyForRankChange("unknown_type" as "rank_improved", 1)).toBe(false)
    })

    it("respects threshold for different change magnitudes", () => {
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, threshold: 3 })
      expect(shouldNotifyForRankChange("rank_improved", 2)).toBe(false)
      expect(shouldNotifyForRankChange("rank_improved", 3)).toBe(true)
      expect(shouldNotifyForRankChange("rank_improved", 5)).toBe(true)
    })
  })
})
