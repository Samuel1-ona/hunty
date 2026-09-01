"use client"

import { MessageSquare, Settings, X } from "lucide-react"
import React, { useEffect, useRef,useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  addChatMessage,
  deleteChatMessage,
  getChatMessages,
  getChatSettings,
  mutePlayer,
  reportMessage,
  toggleChatEnabled,
  unmutePlayer,
} from "@/lib/chat"
import type { ChatMessage as ChatMessageType } from "@/lib/types"

import { ChatInput } from "./ChatInput"
import { ChatMessage } from "./ChatMessage"

interface ChatWindowProps {
  huntId: number
  currentUserAddress?: string
  creatorAddress?: string
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  huntId,
  currentUserAddress,
  creatorAddress,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [settings, setSettings] = useState(() => getChatSettings(huntId))
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      setMessages(getChatMessages(huntId))
      setSettings(getChatSettings(huntId))
    }
  }, [huntId, isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (content: string) => {
    if (!currentUserAddress) return
    const newMessage = addChatMessage(huntId, {
      huntId,
      senderAddress: currentUserAddress,
      content,
      senderName: `${currentUserAddress.slice(0, 6)}...`,
    })
    setMessages(prev => [...prev, newMessage])
  }

  const handleDeleteMessage = (messageId: string) => {
    deleteChatMessage(huntId, messageId)
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, isDeleted: true } : msg
    ))
  }

  const handleMutePlayer = (address: string) => {
    const newMuted = mutePlayer(huntId, address)
    setSettings(prev => ({ ...prev, mutedAddresses: newMuted }))
  }

  const handleReportMessage = (messageId: string, reason: string) => {
    if (!currentUserAddress) return
    reportMessage(messageId, huntId, currentUserAddress, reason)
  }

  const isCreator = currentUserAddress === creatorAddress
  const filteredMessages = messages.filter(msg =>
    !settings.mutedAddresses.includes(msg.senderAddress)
  )

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className="w-80 h-[500px] flex flex-col shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Hunt Chat
            </CardTitle>
            <div className="flex items-center gap-2">
              {isCreator && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      const newEnabled = toggleChatEnabled(huntId)
                      setSettings(prev => ({ ...prev, isChatEnabled: newEnabled }))
                    }}>
                      {settings.isChatEnabled ? "Disable Chat" : "Enable Chat"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {settings.isChatEnabled ? (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">No messages yet</p>
                    </div>
                  ) : (
                    filteredMessages.map(msg => (
                      <ChatMessage
                        key={msg.id}
                        message={msg}
                        currentUserAddress={currentUserAddress}
                        isCreator={isCreator}
                        onDelete={isCreator ? handleDeleteMessage : undefined}
                        onMute={handleMutePlayer}
                        onReport={handleReportMessage}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={!currentUserAddress}
                  placeholder={currentUserAddress ? "Type a message..." : "Connect wallet to chat"}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
                <p className="text-sm text-center">Chat is disabled for this hunt</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}
