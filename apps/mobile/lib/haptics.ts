import * as Haptics from "expo-haptics";

type NotificationType = "success" | "warning" | "error";
type ImpactStyle = "light" | "medium" | "heavy";

const NotificationFeedbackType = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
} as const;

const ImpactFeedbackStyle = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
} as const;

export async function triggerNotification(type: NotificationType): Promise<void> {
  try {
    const feedbackType: string | undefined = NotificationFeedbackType[type];
    if (feedbackType !== undefined) {
      await Haptics.notificationAsync(feedbackType as Haptics.NotificationFeedbackType);
    }
  } catch {
    // Haptics are non-critical; silently ignore errors
  }
}

export async function triggerImpact(style: ImpactStyle): Promise<void> {
  try {
    const impactStyle: string | undefined = ImpactFeedbackStyle[style];
    if (impactStyle !== undefined) {
      await Haptics.impactAsync(impactStyle as Haptics.ImpactFeedbackStyle);
    }
  } catch {
    // Haptics are non-critical; silently ignore errors
  }
}

export async function triggerSelection(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Haptics are non-critical; silently ignore errors
  }
}

export const hapticTriggers = {
  joinSuccess: () => triggerNotification("success"),
  scanSuccess: () => triggerImpact("medium"),
  scanSubtle: () => triggerImpact("light"),
  taskSuccess: () => triggerNotification("success"),
  rewardHeavy: () => triggerImpact("heavy"),
};
