"use client"

import {hankenGrotesk} from "@/lib/font"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/Header"




interface WalletOption {
  id: string
  name: string
  icon: string
  description?: string
}

const walletOptions: WalletOption[] = [
  { id: "web-wallet", name: "Web Wallet", description: "(Powered by Argent)", icon: "📧" },
  { id: "argent-x", name: "Argent X", icon: "🦊" },
  { id: "argent-mobile", name: "Argent Mobile", icon: "📱" },
  { id: "braavos", name: "Braavos", icon: "🛡️" },
  { id: "okx-wallet", name: "OKX Wallet", icon: "⚫" },
]

export default function GameArcade() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [gameLink, setGameLink] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [balance, setBalance] = useState("")

  const handleWalletSelect = (wallet: WalletOption) => {
    setSelectedWallet(wallet)
    setIsConnectingWallet(true)
    // Simulate wallet address generation
    setWalletAddress("0xe5f...E5")
  }

  const handleContinue = () => {
    setIsConnected(true)
    setBalance("24.2453")
    setIsWalletModalOpen(false)
    setIsConnectingWallet(false)
    setSelectedWallet(null)
    setDisplayName("")
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setWalletAddress("")
    setBalance("")
  }

  const handleCreateGame = () => {
    window.location.href = "/hunty"
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff]`}
    >
      {/* Header */}
      <Header
        isConnected={isConnected}
        balance={balance}
        walletAddress={walletAddress}
        onConnectWallet={() => setIsWalletModalOpen(true)}
        onDisconnect={handleDisconnect}
      />

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto bg-white rounded-4xl pb-12 relative pt-24">
        {/* Logo and Title */}
        <div className="text-center mb-8"> 
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0C0C4F] shadow-lg absolute left-1/2 top-1 -translate-x-1/2 -translate-y-1/2">
              {/* logo */ }
               <Image src="/icons/logo.png" alt="Logo" width={96} height={96} />
          </div>
          <h1 className={`text-4xl md:text-5xl text-slate-800 font-bold mb-8 ${hankenGrotesk.variable} antialiased bg-gradient-to-br from-#3737A4 to-#0C0C4F`}>The Ultimate Web3 Game Arcade</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button className={`bg-[#0C0C4F] hover:bg-slate-700 text-white px-8 py-3 rounded-lg text-lg cursor-pointer`} onClick={handleCreateGame}>
            Create Game
          </Button>
          <Button className="bg-[#E87785] hover:bg-[#d4606f] text-white px-8 py-3 rounded-lg text-lg cursor-pointer">Play Game</Button>
        </div>

        {/* Game Link Input */}
        <div className="text-center mb-12">
          <p className="text-slate-700 mb-4 font-medium">Enter Game Link</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="url"
              placeholder="https://www.galagorch.com/g/***"
              value={gameLink}
              onChange={(e) => setGameLink(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-pink-400"
            />
            <Button className="bg-[#E87785] hover:bg-[#d4606f] text-white px-6 py-2 rounded-lg cursor-pointer">Play Game</Button>
          </div>
        </div>

        {/* Game Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {/* Crossbites Game */}

          <Card>
            <div className={`p-8 flex-1 bg-[#ececfa] backdrop-blur-md rounded-2xl border border-white/20" style={{boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`}>
            <div className="grid grid-cols-5 gap-1.5 max-w-80 mx-auto">
                    {/* Row 1 */}
                    <div className="col-start-2">
                      <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
                        <span className="text-white font-bold text-lg">W</span>
                      </div>
                    </div>
                    <div className="col-start-4 col-span-2 grid grid-cols-2 gap-2">
                      <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
                    </div>

                    {/* Row 2 */}
                    <div className="w-12 h-12 bg-gradient-to-b from-[#4F0C14] to-[#A43751] rounded-lg flex items-center justify-center border-6 border-[#E87785]">
                      <span className="text-white font-bold text-lg">A</span>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
                      <span className="text-white font-bold text-lg">A</span>
                    </div>
                    <div className="col-start-4 col-span-2 grid grid-cols-2 gap-2">
                      <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
                    </div>

                    {/* Row 3 - GREAT */}
                    <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
                      <span className="text-white font-bold text-lg">G</span>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
                      <span className="text-white font-bold text-lg">R</span>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
                      <span className="text-white font-bold text-lg">E</span>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
                      <span className="text-white font-bold text-lg">A</span>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
                      <span className="text-white font-bold text-lg">T</span>
                    </div>

                    {/* Row 4 */}
                    <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
                    <div className="col-start-4">
                      <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
                    </div>
                  </div>    
            </div>

            <Link className="bg-[#2D2D97]  py-6 rounded-br-lg rounded-bl-lg text-white text-2xl font-bold text-center tracking-wider" href="/">
              CROSSBITES
            </Link>
          </Card>     

          {/* Hunty Game */}
          <Card>
          <div className={`bg-[#ececfa] backdrop-blur-md rounded-2xl border border-white/20" style={{boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) px-8 py-3.5  flex-1 flex gap-2`}>
            <Card className="flex-1 text-white justify-center">
              <div className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] flex-1 rounded-t-lg p-3">
                <CardTitle className="text-[13px] font-bold">What is the fastest bird?</CardTitle>
                <CardDescription className="text-[8px] mt-2 text-white">The Description appears here...Yorem ipsum dolor sit amet, consectetur adipiscing elit.</CardDescription>
                <div className="mt-2">
                  <Image src="/static-images/image1.png" alt="bird" width={132} height={132} />
                </div>
                <div className="mt-2">
                  <Button className="bg-gradient-to-b from-[#2F2FFF]  to-[#E87785] sh-6 text-[7.76px] p-[3px]"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-link-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>Hint To Unlock</span></Button>
                </div>
              </div>
              <div className="flex gap-1 bg-white items-center align-center p-3 rounded-b-lg
              ">
                <Input placeholder="Enter code to unlock" className="h-[19px] text-[8px]"/>
                <div className="w-6 h-full bg-gradient-to-b from-[#3737A4]  to-[#0C0C4F] rounded-md flex items-center justify-center p-1"><ArrowRight className="w-4 h-4"/></div>
              </div>
            </Card>
            
            <div>
              <div className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-white p-3 rounded-t-lg">
                  <CardTitle className="text-[13px] font-bold">What is the biggest bird?</CardTitle>
                  <CardDescription className="text-[8px] mt-2 text-white">long legs, tiny brain </CardDescription>
                  <div className="mt-2">
                    <Button className="bg-gradient-to-b from-[#2F2FFF]  to-[#E87785] text-[8px]"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-link-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> <span className="text-[8px]">Hint To Unlock</span></Button>
                  </div>
                  
              </div>

              <div className="flex gap-1 bg-white items-center align-center p-3 rounded-b-lg
              ">
                  <Input placeholder="Enter code to unlock" className="h-[19px] text-[8px]"/>
                  <div className="w-6 h-full bg-gradient-to-b from-[#3737A4]  to-[#0C0C4F] rounded-md p-0.5 flex items-center justify-center"><ArrowRight className="w-4 h-4"/></div>
              </div>
            </div>
            
          </div>
          <Link className="bg-[#2D2D97] py-6 rounded-br-lg rounded-bl-lg text-white text-2xl font-bold text-center tracking-wider" href="/">
              Hunty
          </Link>
          </Card>         
        </div>
      </div>

      {/* Wallet Connection Modal */}
      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-slate-800 font-semibold">Connect a wallet</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsWalletModalOpen(false)}
              className="h-6 w-6 rounded-full bg-pink-500 hover:bg-pink-600 text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {!isConnectingWallet ? (
            <div className="space-y-3">
              {walletOptions.map((wallet) => (
                <Button
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl flex items-center gap-3 justify-start h-auto"
                >
                  <span className="text-xl">{wallet.icon}</span>
                  <div className="text-left">
                    <div className="font-medium">{wallet.name}</div>
                    {wallet.description && <div className="text-sm opacity-80">{wallet.description}</div>}
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Wallet Address</label>
                <div className="bg-gray-100 p-3 rounded-lg text-sm text-slate-600">{walletAddress}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Set a Display Name (optional)</label>
                <Input
                  placeholder="DisplayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button
                onClick={handleContinue}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-full flex items-center gap-2"
              >
                Continue
                <span>→</span>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


