"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"

interface WalletOption {
  id: string
  name: string
  icon: string
  description?: string
}

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (address: string) => void
}

const walletOptions: WalletOption[] = [
  { id: "web-wallet", name: "Web Wallet", description: "(Powered by Argent)", icon: "📧" },
  { id: "argent-x", name: "Argent X", icon: "🦊" },
  { id: "argent-mobile", name: "Argent Mobile", icon: "📱" },
  { id: "braavos", name: "Braavos", icon: "🛡️" },
  { id: "okx-wallet", name: "OKX Wallet", icon: "⚫" },
]

export function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [walletAddress, setWalletAddress] = useState("")

  const handleWalletSelect = (wallet: WalletOption) => {
    setSelectedWallet(wallet)
    setIsConnecting(true)
    setWalletAddress("0xe5f...E5")
  }

  const handleContinue = () => {
    onConnect(walletAddress)
    onClose()
    setIsConnecting(false)
    setSelectedWallet(null)
    setDisplayName("")
  }

  const handleClose = () => {
    onClose()
    setIsConnecting(false)
    setSelectedWallet(null)
    setDisplayName("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-slate-800 font-semibold">Connect a wallet</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-6 w-6 rounded-full bg-pink-500 hover:bg-pink-600 text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {!isConnecting ? (
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
  )
}
