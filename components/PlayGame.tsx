"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft} from "lucide-react"
import { Header } from "@/components/Header"
import Share from "./icons/Share"
import Image from "next/image"
import Replay from "./icons/Replay"

interface Hunt {
  id: number
  title: string
  description: string
  link: string
  code: string
}

interface PlayGameProps {
  hunts: Hunt[]
  gameName: string
  onExit: () => void
  onGameComplete: () => void
  gameCompleteModal: React.ReactNode
}

export function PlayGame({ hunts, gameName, onExit, onGameComplete, gameCompleteModal }: PlayGameProps) {
  const [unlockCode, setUnlockCode] = useState("")

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff]">
      <Header
        isConnected={true}
        balance="24.2453"
        walletAddress="0xe5f...E5"
        onConnectWallet={() => {}}
        onDisconnect={() => {}}
      />

      <div className="max-w-[1500px] px-14 pt-10 pb-12 bg-white mx-auto rounded-4xl relative">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={onExit}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-6 h-6 fill-[#0C0C4F]" />
            <span className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text text-xl font-normal">Go Home</span>
          </Button>
          <div className="text-right ml-auto">
            <span className="bg-gradient-to-b from-[#E3225C] to-[#7B1C4A] text-transparent bg-clip-text text-xl font-normal">Edit Game</span>
            <br />
            <span className="text-sm bg-gradient-to-b from-[#787884] to-[#576065] text-transparent bg-clip-text">(Only You Can See This)</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0C0C4F] shadow-lg absolute left-1/2 top-1 -translate-x-1/2 -translate-y-1/2">
             <Image src="/icons/logo.png" alt="Logo" width={96} height={96} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-b to-[#3737A4] from-[#0C0C4F] bg-clip-text text-transparent mb-6">Play {gameName}</h1>
          <div className="flex justify-center gap-4 mb-8">
            <Button className="bg-gradient-to-b from-[#E3225C] to-[#7B1C4A] hover:bg-pink-600 text-white px-6 py-2 rounded-full flex items-center gap-2">
              <Replay/> Reset
            </Button>
            <Button className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 text-white px-6 py-2 rounded-full flex items-center gap-2">
              <Share/>
              Share Link
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-b from-blue-800 to-purple-800 rounded-2xl p-6 text-white">
            <div className="text-right text-sm mb-4">1/10</div>
            <h3 className="text-xl font-bold mb-2">{hunts[0]?.title || "What is the fastest bird?"}</h3>
            <p className="text-sm opacity-90 mb-4">
              {hunts[0]?.description ||
                "The Description appears here. Viverra ipsum dolor sit amet, consectetur adipiscing elit."}
            </p>
            <div className="relative mb-4">
              <Image
                src="/placeholder.svg?height=200&width=300"
                alt="Kingfisher bird"
                width={300}
                height={200}
                className="rounded-lg w-full"
              />
            </div>
            <Button className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full text-sm">
              🎯 Hint To Unlock
            </Button>
          </div>

          <div className="bg-gradient-to-b from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
            <div className="text-right text-sm mb-4">2/10</div>
            <h3 className="text-xl font-bold mb-2">{hunts[1]?.title || "What is the biggest bird?"}</h3>
            <p className="text-sm opacity-90 mb-4">{hunts[1]?.description || "Long legs, tiny brain"}</p>
            <Button className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full text-sm mb-4">
              🎯 Hint To Unlock
            </Button>
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <div className="flex gap-4 max-w-md w-full">
            <Input
              placeholder="Enter code to unlock"
              value={unlockCode}
              onChange={(e) => setUnlockCode(e.target.value)}
              className="flex-1 px-4 py-2 rounded-full"
            />
            <Button
              onClick={onGameComplete}
              className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-full"
            >
              →
            </Button>
          </div>
        </div>
      </div>

      {gameCompleteModal}
    </div>
  )
}
