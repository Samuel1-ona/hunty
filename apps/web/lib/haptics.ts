import { logger } from "@/lib/logger"

type NotificationType = "success" | "warning" | "error"
type ImpactStyle = "light" | "medium" | "heavy"

type HapticsModule = {
  NotificationFeedbackType: {
    Success: string
    Warning: string
    Error: string
  }
  ImpactFeedbackStyle: {
    Light: string
    Medium: string
    Heavy: string
  }
  notificationAsync: (type: string) => Promise<void>
  impactAsync: (style: string) => Promise<void>
  selectionAsync: () => Promise<void>
}

// Lazy-load expo-haptics so web/root test environments can safely no-op.
let cachedHapticsPromise: Promise<HapticsModule | null> | null = null

async function loadHapticsModule(): Promise<HapticsModule | null> {
  if (cachedHapticsPromise) return cachedHapticsPromise

  const expoHapticsModule = "expo-haptics"

  cachedHapticsPromise = import(/* @vite-ignore */ expoHapticsModule)
    .then((module) => module as HapticsModule)
    .catch((error: unknown) => {
      logger.warn("Failed to load expo-haptics:", error)
      return null
    })

  return cachedHapticsPromise
}

export async function triggerNotification(type: NotificationType): Promise<void> {
  const Haptics = await loadHapticsModule()
  if (!Haptics) return

  try {
    let feedbackType: string | undefined
    switch (type) {
      case "success":
        feedbackType = Haptics.NotificationFeedbackType.Success
        break
      case "warning":
        feedbackType = Haptics.NotificationFeedbackType.Warning
        break
      case "error":
        feedbackType = Haptics.NotificationFeedbackType.Error
        break
    }

    if (feedbackType !== undefined) {
      await Haptics.notificationAsync(feedbackType)
    }
  } catch (error) {
    logger.warn(`Haptics.notificationAsync(${type}) failed:`, error)
  }
}

export async function triggerImpact(style: ImpactStyle): Promise<void> {
  const Haptics = await loadHapticsModule()
  if (!Haptics) return

  try {
    let impactStyle: string | undefined
    switch (style) {
      case "light":
        impactStyle = Haptics.ImpactFeedbackStyle.Light
        break
      case "medium":
        impactStyle = Haptics.ImpactFeedbackStyle.Medium
        break
      case "heavy":
        impactStyle = Haptics.ImpactFeedbackStyle.Heavy
        break
    }

    if (impactStyle !== undefined) {
      await Haptics.impactAsync(impactStyle)
    }
  } catch (error) {
    logger.warn(`Haptics.impactAsync(${style}) failed:`, error)
  }
}

export async function triggerSelection(): Promise<void> {
  const Haptics = await loadHapticsModule()
  if (!Haptics) return

  try {
    await Haptics.selectionAsync()
  } catch (error) {
    logger.warn("Haptics.selectionAsync failed:", error)
  }
}

export const hapticTriggers = {
  joinSuccess: () => triggerNotification("success"),
  scanSuccess: () => triggerImpact("medium"),
  scanSubtle: () => triggerImpact("light"),
  taskSuccess: () => triggerNotification("success"),
  rewardHeavy: () => triggerImpact("heavy"),
}
