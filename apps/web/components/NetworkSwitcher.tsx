"use client"

import { useState, useEffect } from "react"
import { getSorobanNetworkType, setSorobanNetworkType } from "@/lib/soroban/client"
import { AlertTriangle, CheckCircle2, Globe, RefreshCw } from "lucide-react"
import { Button } from "@hunty/ui"

export function NetworkSwitcher() {
  const [currentNetwork, setCurrentNetwork] = useState<"testnet" | "mainnet">("testnet")
  const [isChanging, setIsChanging] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingNetwork, setPendingNetwork] = useState<"testnet" | "mainnet" | null>(null)

  useEffect(() => {
    setCurrentNetwork(getSorobanNetworkType())
  }, [])

  const handleNetworkChange = (network: "testnet" | "mainnet") => {
    if (network === currentNetwork) return
    
    setPendingNetwork(network)
    setShowConfirm(true)
  }

  const confirmNetworkChange = () => {
    if (!pendingNetwork) return

    setIsChanging(true)
    setSorobanNetworkType(pendingNetwork)
    setCurrentNetwork(pendingNetwork)
    setShowConfirm(false)
    setPendingNetwork(null)
    
    // Reload the page to reinitialize all connections with new network
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const cancelNetworkChange = () => {
    setShowConfirm(false)
    setPendingNetwork(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Stellar Network
        </h3>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-600 dark:text-slate-400">Current Network:</span>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className={`w-2 h-2 rounded-full ${
              currentNetwork === "mainnet" 
                ? "bg-green-500" 
                : "bg-yellow-500"
            }`} />
            {currentNetwork === "mainnet" ? "Mainnet" : "Testnet"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleNetworkChange("testnet")}
            disabled={isChanging}
            className={`p-4 rounded-lg border-2 transition-all ${
              currentNetwork === "testnet"
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                : "border-slate-200 dark:border-white/10 hover:border-yellow-300 dark:hover:border-yellow-700"
            } ${isChanging ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {currentNetwork === "testnet" && (
                <CheckCircle2 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              )}
              <span className="font-semibold text-slate-900 dark:text-white">Testnet</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 text-left">
              For development and testing
            </p>
          </button>

          <button
            onClick={() => handleNetworkChange("mainnet")}
            disabled={isChanging}
            className={`p-4 rounded-lg border-2 transition-all ${
              currentNetwork === "mainnet"
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-slate-200 dark:border-white/10 hover:border-green-300 dark:hover:border-green-700"
            } ${isChanging ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {currentNetwork === "mainnet" && (
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              )}
              <span className="font-semibold text-slate-900 dark:text-white">Mainnet</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 text-left">
              Production Stellar network
            </p>
          </button>
        </div>

        {currentNetwork === "testnet" && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-800 dark:text-yellow-200">
                <p className="font-semibold mb-1">You're on Testnet</p>
                <p>Transactions use test XLM. Switch to Mainnet for real assets.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 max-w-md mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Switch to {pendingNetwork === "mainnet" ? "Mainnet" : "Testnet"}?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {pendingNetwork === "mainnet" ? (
                    <>
                      You're about to switch to <span className="font-semibold text-slate-900 dark:text-white">Mainnet</span>.
                      Transactions will use real XLM and interact with production smart contracts.
                      The page will reload to apply changes.
                    </>
                  ) : (
                    <>
                      You're about to switch to <span className="font-semibold text-slate-900 dark:text-white">Testnet</span>.
                      You'll be using test XLM for development purposes.
                      The page will reload to apply changes.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={cancelNetworkChange}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmNetworkChange}
                className={`flex-1 ${
                  pendingNetwork === "mainnet"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                } text-white`}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Switch & Reload
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
