import { Flag, MoreHorizontal, UserX } from "lucide-react"
import React from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ChatMessage as ChatMessageType } from "@/lib/types"

interface ChatMessageProps {
  message: ChatMessageType
  currentUserAddress?: string
  isCreator?: boolean
  onDelete?: (messageId: string) => void
  onMute?: (address: string) => void
  onReport?: (messageId: string, reason: string) => void
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  currentUserAddress,
  isCreator,
  onDelete,
  onMute,
  onReport,
}) => {
  if (message.isDeleted) {
    return (
      <div className="py-2 px-3 text-sm text-slate-400 italic">
        <span>Message deleted</span>
      </div>
    )
  }

  const isCurrentUser = message.senderAddress === currentUserAddress
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div
      className={`flex gap-3 py-2 px-3 rounded-lg ${
        isCurrentUser ? "ml-auto bg-blue-50 dark:bg-blue-900/20 max-w-[80%]" : "mr-auto bg-slate-50 dark:bg-slate-800 max-w-[80%]"
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
            {message.senderName || `${message.senderAddress.slice(0, 6)}...`}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400">{time}</span>
            {!isCurrentUser && (onDelete || onMute || onReport) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onReport && (
                    <DropdownMenuItem onClick={() => onReport(message.id, "Inappropriate content")}>
                      <Flag className="mr-2 h-4 w-4" />
                      Report
                    </DropdownMenuItem>
                  )}
                  {onMute && (
                    <DropdownMenuItem onClick={() => onMute(message.senderAddress)}>
                      <UserX className="mr-2 h-4 w-4" />
                      Mute
                    </DropdownMenuItem>
                  )}
                  {isCreator && onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(message.id)}>
                      Delete message
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-800 dark:text-slate-100 break-words">
          {message.content}
        </p>
      </div>
    </div>
  )
}
