"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import Coin from "./ui/coin"

interface HeaderProps {
  isConnected: boolean
  balance: string
  walletAddress: string
  onConnectWallet: () => void
  onDisconnect: () => void
}

export function Header({ isConnected, balance, walletAddress, onConnectWallet, onDisconnect }: HeaderProps) {
  return (
    <header className="flex justify-between items-center py-8 max-w-[1500px] mx-40 pb-12">
              <Image src="/icons/logo.png" alt="Logo" width={72} height={72} />
      
      {isConnected ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full">
            <Coin/>
            <span className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent text-xl font-medium"> {balance}</span>
          </div>
          <Button onClick={onDisconnect} className="border-2 border-transparent bg-gradient-to-r from-[#0C0C4F] to-[#4A4AFF] bg-origin-border hover:opacity-80" style={{background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #0C0C4F, #4A4AFF) border-box'}}>
            <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#3737A4] to-[#0C0C4F]"></div>
            <span className="text-xl font-black bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text"> {walletAddress}</span>
          </Button>
        </div>
      ) : (
        <Button onClick={onConnectWallet} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-full">
          Connect Wallet
        </Button>
      )}
    </header>
  )
}
