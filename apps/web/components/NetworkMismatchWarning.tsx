"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { checkWalletNetworkMatch, type NetworkMismatchError } from "@/lib/wallets/networkDetection"
import type { WalletProvider } from "@/lib/walletAdapter"

interface NetworkMismatchWarningProps {
  walletProvider: WalletProvider | null
  isConnected: boolean
}

/**
 * NetworkMismatchWarning Component
 * Shows a warning when the wallet network doesn't match the app network
 */
export function NetworkMismatchWarning({ 
  walletProvider, 
  isConnected 
}: NetworkMismatchWarningProps) {
  const [mismatch, setMismatch] = useState<NetworkMismatchError | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isConnected || !walletProvider) {
      setMismatch(null)
      return
    }

    // Check for network mismatch
    const checkNetwork = async () => {
      const result = await checkWalletNetworkMatch(walletProvider)
      setMismatch(result)
    }

    checkNetwork()

    // Recheck every 10 seconds while connected
    const interval = setInterval(checkNetwork, 10000)
    return () => clearInterval(interval)
  }, [isConnected, walletProvider])

  if (!mismatch || dismissed) {
    return null
  }

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-2xl mx-4">
      <div className="bg-orange-50 dark:bg-orange-900/30 border-2 border-orange-300 dark:border-orange-700 rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-orange-900 dark:text-orange-200 mb-1">
              Network Mismatch Detected
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
              Your wallet is connected to <span className="font-semibold">{mismatch.walletNetwork}</span> but 
              the app is configured for <span className="font-semibold">{mismatch.appNetwork}</span>. 
              Transactions may fail until you switch networks.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => window.location.href = "/settings"}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
              >
                Go to Settings
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDismissed(true)}
                className="text-xs border-orange-300 dark:border-orange-700"
              >
                Dismiss
              </Button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
