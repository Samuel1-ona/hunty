"use client"

import { useWallet } from "@/lib/wallet"
import { ChatWindow } from "@/components/ChatWindow"

interface HuntChatProps {
  huntId: number
  creatorAddress?: string
}

export function HuntChat({ huntId, creatorAddress }: HuntChatProps) {
  const { address } = useWallet()
  return <ChatWindow huntId={huntId} currentUserAddress={address} creatorAddress={creatorAddress} />
}