"use client"

import { dynapuff } from "@/lib/font"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ArrowRight, Plus, Share, QrCode, Download, Printer } from "lucide-react"
import { Header } from "@/components/Header"
import { CreateGameTabs } from "@/components/CreateGameTabs"
import { HuntForm } from "@/components/HuntForm"
import { RewardsPanel } from "@/components/RewardsPanel"
import { LeaderboardTable } from "@/components/LeaderBoardTable"
import { GamePreview } from "@/components/GamePreview"
import { PublishModal } from "@/components/PublishModal"
import { GameCompleteModal } from "@/components/GameCompleteModal"
import { PlayGame } from "@/components/PlayGame"
import Image from "next/image"
import ToggleButton from "@/components/ToggleButton"

interface Hunt {
  id: number
  title: string
  description: string
  link: string
  code: string
  image?: string
}

interface Reward {
  place: number
  amount: number
  icon: string
}

interface LeaderboardEntry {
  position: number
  name: string
  points: number
  icon: string
}

export default function CreateGame() {
  const [activeTab, setActiveTab] = useState<"create" | "rewards" | "publish" | "leaderboard">("create")
  const [hunts, setHunts] = useState<Hunt[]>([{ id: 1, title: "", description: "", link: "", code: "" }])
  const [rewards, setRewards] = useState<Reward[]>([
    { place: 1, amount: 5.43, icon: "🥇" },
    { place: 2, amount: 5.43, icon: "🥈" },
  ])
  const [gameName, setGameName] = useState("Hunty")
  const [timer, setTimer] = useState({ minutes: 0, seconds: 15 })
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("00:00 AM")
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showGameCompleteModal, setShowGameCompleteModal] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const leaderboardData: LeaderboardEntry[] = [
    { position: 1, name: "JohnDoe", points: 9, icon: "🥇" },
    { position: 2, name: "TDH", points: 6, icon: "🥈" },
    { position: 3, name: "User904", points: 5, icon: "🥉" },
    { position: 4, name: "0xE394fd1329g3a3wh23fH", points: 4, icon: "4" },
    { position: 5, name: "JohnDoe", points: 3, icon: "5" },
  ]

  const updateHunt = (id: number, field: keyof Hunt, value: string) => {
    setHunts(hunts.map((hunt) => (hunt.id === id ? { ...hunt, [field]: value } : hunt)))
  }

  const addHunt = () => {
    const newId = Math.max(...hunts.map((h) => h.id)) + 1
    setHunts([...hunts, { id: newId, title: "", description: "", link: "", code: "" }])
  }

  const removeHunt = (id: number) => {
    if (hunts.length > 1) {
      setHunts(hunts.filter((hunt) => hunt.id !== id))
    }
  }

  const updateReward = (place: number, amount: number) => {
    setRewards(rewards.map((reward) => (reward.place === place ? { ...reward, amount } : reward)))
  }

  const handlePublish = () => {
    setShowPublishModal(false)
    setIsPlaying(true)
  }

  const handleTest = () => {
    setIsPlaying(true)
  }

  if (isPlaying) {
    return (
      <PlayGame
        hunts={hunts}
        gameName={gameName}
        onExit={() => setIsPlaying(false)}
        onGameComplete={() => setShowGameCompleteModal(true)}
        gameCompleteModal={
          <GameCompleteModal
            isOpen={showGameCompleteModal}
            onClose={() => setShowGameCompleteModal(false)}
            onGoHome={() => {
              setShowGameCompleteModal(false)
              setIsPlaying(false)
            }}
            onReplay={() => setShowGameCompleteModal(false)}
            onViewLeaderboard={() => {
              setShowGameCompleteModal(false)
              setActiveTab("leaderboard")
              setIsPlaying(false)
            }}
            reward={5.43}
          />
        }
      />
    )
  }

  if (activeTab === "leaderboard" && !isPlaying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f9f9ff] to-[#fce4ec]">
        <Header
          isConnected={true}
          balance="24.2453"
          walletAddress="0xe5f...E5"
          onConnectWallet={() => {}}
          onDisconnect={() => {}}
        />

        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => setActiveTab("create")}
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Home
            </Button>
          </div>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
              <span className="text-white font-bold text-2xl">GG</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">Leaderboard - Hunty</h1>
            <div className="flex justify-center gap-4 mb-8">
              <Button className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-full flex items-center gap-2">
                <span>🔄</span> Replay
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full flex items-center gap-2">
                <Share className="w-4 h-4" />
                Share Link
              </Button>
            </div>
          </div>

          <LeaderboardTable data={leaderboardData} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] pb-28">
      <Header
        isConnected={true}
        balance="24.2453"
        walletAddress="0xe5f...E5"  
        onConnectWallet={() => {}}
        onDisconnect={() => {}}
      />

      <div className="max-w-[1500px] mx-40 pb-12 bg-white rounded-4xl  relative ">
        {/* the white background */}
        <div className="max-w-6xl mx-auto">
          {/* Navigation */}
          <div className="flex items-center gap-4 mb-7">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900 mt-10"
            >
              <ArrowLeft className="w-4 h-4" />                                     
              Go Home
            </Button>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0C0C4F] shadow-lg absolute left-1/2 top-1 -translate-x-1/2 -translate-y-1/2">
              {/* logo */ }
              <Image src="/icons/logo.png" alt="Logo" width={96} height={96} />
            </div>
            <h1 className={`text-4xl md:text-5xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text mb-8 ${dynapuff.variable} antialiased `}>Create Scavenge Hunt</h1>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Panel */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <CreateGameTabs activeTab={activeTab} onTabChange={setActiveTab} />

              {activeTab === "create" && (
                <div className="space-y-6">
                  {hunts.map((hunt) => (
                    <HuntForm
                      key={hunt.id}
                      hunt={hunt}
                      onUpdate={(field, value) => updateHunt(hunt.id, field, value)}
                      onRemove={() => removeHunt(hunt.id)}
                    />
                  ))}
                 
                    <div className="inline-block p-[1px] rounded-2xl bg-gradient-to-b from-[#4A4AFF] to-[#0C0C4F]">
                      <Button
                        onClick={addHunt} 
                        className="flex items-center gap-2 bg-white text-[#0C0C4F] font-bold text-xl px-5 py-3 rounded-2xl " 
                      >
                        <Plus className="w-6 h-6 text-[#0C0C4F]" />
                        Add
                      </Button>
                    </div>

                    {/* </div> */}

                  <div className="flex justify-end">
                    <Button className="bg-slate-800 hover:bg-slate-700 text-white text-xl font-extrabold
                     px-6 py-4 rounded-xl flex items-center gap-2 cursor-pointer">
                      Next
                      <ArrowRight className="w-6 h-6" />
                    </Button>
                  </div>  
                </div>
              )}

              {activeTab === "rewards" && (
                <div className="space-y-6">
                  <RewardsPanel rewards={rewards} onUpdateReward={updateReward} />

                  <div className="flex justify-between">
                    <Button className="bg-gradient-to-b from-[#576065] to-[#787884] hover:bg-gray-500 text-white px-8 py-2 rounded-xl flex items-center gap-2 text-xl font-black">
                      <ArrowLeft className="w-6 h-6" />
                      Previous
                    </Button>
                    <Button className="bg-gradient-to-b from-[#576065] to-[#787884] hover:bg-gray-500 text-white px-8 py-2 rounded-xl flex items-center gap-2 text-xl font-black">
                      Next
                      <ArrowRight className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "publish" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="block text-xl font-normal text-[#808080]">Give It A Name</label>
                    <Input value={gameName} onChange={(e) => setGameName(e.target.value)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="block text-xl font-normal text-[#808080]">Set Timeframe</label>
                    <div className="flex items-center gap-0.5"><Input placeholder="00"/><span className="text-2xl bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] font-medium bg-clip-text">:</span><Input placeholder="00"/></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="block text-xl font-normal text-[#808080]">Timer</label>
                    <ToggleButton/>  
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="block text-xl font-normal text-[#808080]">End Date</label>
                    <div className="flex gap-[8px]">  
                       <Input placeholder="dd/mm/yy"/>
                       <Input  placeholder="00:00 AM"/></div>
                    </div>

                  <div className="flex items-center justify-between">
                    <label className="block text-xl font-normal text-[#808080]">Share Link/Generate QR Code</label>
                    <div className="flex gap-2">
                      <Button className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F]  hover:bg-slate-700 text-white px-4 py-2 rounded-full flex items-center gap-2">
                        <Share className="w-4 h-4" />
                        Share Now
                      </Button>
                      <Button size="icon" variant="outline" className="rounded-lg">
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-16">
                  <label className="block text-xl font-normal text-[#808080]">Save As Image</label>
                    <div className="flex gap-2">
                      <Button className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] hover:bg-slate-700 text-white px-4 py-2 rounded-full flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                      <Button size="icon" variant="outline" className="rounded-lg">
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between pb-12">
                    <Button className="bg-gradient-to-b from-[#576065] to-[#787884] hover:bg-gray-500 text-white text-xl px-8 py-2 rounded-lg flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4 " />
                      Previous
                    </Button>
                    <Button
                      onClick={() => setShowPublishModal(true)}
                      className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 text-white text-xl px-6 py-3 rounded-lg flex items-center gap-2"
                    >
                      <span>📤</span>
                      Publish Game
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "leaderboard" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Leaderboard</h3>
                  <LeaderboardTable data={leaderboardData} isEmbedded={true} />

                  <div className="flex justify-between">
                    <Button className="bg-gradient-to-b from-[#4A4AFF] to-[#0C0C4F] text- px-8 py-2 rounded-full flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      onClick={handleTest}
                      className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-2 rounded-full flex items-center gap-2"
                    >
                      ⚡ Test
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Live Preview */}
            <GamePreview hunts={hunts} />
          </div>
        </div>
      </div>
      

      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublish={handlePublish}
        gameName={gameName}
      />
    </div>
  )
}
