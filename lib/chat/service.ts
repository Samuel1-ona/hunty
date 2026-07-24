import type { ChatMessage, ChatSettings, ReportedMessage } from "@/lib/types"
import { logger } from "@/lib/logger"

// ─── Storage Keys ──────────────────────────────────────────────────────────────
const getChatMessagesKey = (huntId: number) => `hunty_chat_messages_${huntId}`
const getChatSettingsKey = (huntId: number) => `hunty_chat_settings_${huntId}`
const getReportedMessagesKey = () => `hunty_reported_messages`

// ─── Chat Messages ─────────────────────────────────────────────────────────────
export const getChatMessages = (huntId: number): ChatMessage[] => {
  if (typeof window === "undefined") return []

  try {
    const data = localStorage.getItem(getChatMessagesKey(huntId))
    if (!data) return []
    return JSON.parse(data) as ChatMessage[]
  } catch (error) {
    logger.error("Failed to get chat messages:", error)
    return []
  }
}

export const addChatMessage = (
  huntId: number,
  message: Omit<ChatMessage, "id" | "timestamp">
): ChatMessage => {
  const newMessage: ChatMessage = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }

  const messages = getChatMessages(huntId)
  const updatedMessages = [...messages, newMessage]

  localStorage.setItem(
    getChatMessagesKey(huntId),
    JSON.stringify(updatedMessages)
  )

  return newMessage
}

export const deleteChatMessage = (huntId: number, messageId: string): void => {
  const messages = getChatMessages(huntId)
  const updatedMessages = messages.map(msg =>
    msg.id === messageId ? { ...msg, isDeleted: true } : msg
  )

  localStorage.setItem(
    getChatMessagesKey(huntId),
    JSON.stringify(updatedMessages)
  )
}

// ─── Chat Settings ─────────────────────────────────────────────────────────────
export const getChatSettings = (huntId: number): ChatSettings => {
  if (typeof window === "undefined")
    return {
      huntId,
      isChatEnabled: true,
      mutedAddresses: [],
    }

  try {
    const data = localStorage.getItem(getChatSettingsKey(huntId))
    if (!data)
      return {
        huntId,
        isChatEnabled: true,
        mutedAddresses: [],
      }

    return JSON.parse(data) as ChatSettings
  } catch (error) {
    logger.error("Failed to get chat settings:", error)
    return {
      huntId,
      isChatEnabled: true,
      mutedAddresses: [],
    }
  }
}

export const updateChatSettings = (
  huntId: number,
  settings: Partial<ChatSettings>
): ChatSettings => {
  const currentSettings = getChatSettings(huntId)
  const updatedSettings = { ...currentSettings, ...settings }

  localStorage.setItem(
    getChatSettingsKey(huntId),
    JSON.stringify(updatedSettings)
  )

  return updatedSettings
}

export const toggleChatEnabled = (huntId: number): boolean => {
  const currentSettings = getChatSettings(huntId)
  const newEnabled = !currentSettings.isChatEnabled
  updateChatSettings(huntId, { isChatEnabled: newEnabled })
  return newEnabled
}

export const mutePlayer = (huntId: number, address: string): string[] => {
  const currentSettings = getChatSettings(huntId)
  if (!currentSettings.mutedAddresses.includes(address)) {
    const mutedAddresses = [...currentSettings.mutedAddresses, address]
    updateChatSettings(huntId, { mutedAddresses })
    return mutedAddresses
  }
  return currentSettings.mutedAddresses
}

export const unmutePlayer = (huntId: number, address: string): string[] => {
  const currentSettings = getChatSettings(huntId)
  const mutedAddresses = currentSettings.mutedAddresses.filter(
    (addr) => addr !== address
  )
  updateChatSettings(huntId, { mutedAddresses })
  return mutedAddresses
}

// ─── Reported Messages ───────────────────────────────────────────────────────
export const getReportedMessages = (): ReportedMessage[] => {
  if (typeof window === "undefined") return []

  try {
    const data = localStorage.getItem(getReportedMessagesKey())
    if (!data) return []
    return JSON.parse(data) as ReportedMessage[]
  } catch (error) {
    logger.error("Failed to get reported messages:", error)
    return []
  }
}

export const reportMessage = (
  messageId: string,
  huntId: number,
  reportedBy: string,
  reason: string
): ReportedMessage => {
  const newReport: ReportedMessage = {
    id: crypto.randomUUID(),
    messageId,
    huntId,
    reportedBy,
    reason,
    timestamp: Date.now(),
  }

  const reports = getReportedMessages()
  const updatedReports = [...reports, newReport]

  localStorage.setItem(
    getReportedMessagesKey(),
    JSON.stringify(updatedReports)
  )

  return newReport
}
