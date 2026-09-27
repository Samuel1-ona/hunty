"use client"

import { useState, useEffect, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import { X, Smartphone, QrCode, Copy, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import {
  connectWalletConnect,
  disconnectWalletConnect,
  openWalletDeepLink,
  subscribeWalletConnect,
  type WalletConnectState,
} from "@/lib/walletConnect"

const SUPPORTED_WALLETS = [
  {
    id: "lobstr",
    name: "Lobstr",
    icon: "/wallets/lobstr.svg",
    description: "Popular Stellar mobile wallet",
    platforms: ["ios", "android"],
  },
  {
    id: "xbull",
    name: "xBull",
    icon: "/wallets/xbull.svg",
    description: "Stellar wallet with dApp support",
    platforms: ["ios", "android", "extension"],
  },
  {
    id: "rabet",
    name: "Rabet",
    icon: "/wallets/rabet.svg",
    description: "Stellar wallet for web and mobile",
    platforms: ["ios", "android", "extension"],
  },
  {
    id: "freighter",
    name: "Freighter",
    icon: "/wallets/freighter.svg",
    description: "Browser extension by SDF",
    platforms: ["extension"],
  },
]

interface WalletConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConnected?: (publicKey: string) => void
}

export function WalletConnectModal({
  isOpen,
  onClose,
  onConnected,
}: WalletConnectModalProps) {
  const [view, setView] = useState<"list" | "qr" | "connecting">("list")
  const [qrUri, setQrUri] = useState<string>("")
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [wcState, setWcState] = useState<WalletConnectState | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const unsub = subscribeWalletConnect((state) => {
      setWcState(state)
      if (state.connected && state.session) {
        const publicKey = state.session.accounts[0]
        if (publicKey) {
          onConnected?.(publicKey)
          onClose()
        }
      }
      if (state.error) {
        toast.error(state.error)
        setView("list")
      }
    })
    return unsub
  }, [isOpen, onClose, onConnected])

  const handleWalletSelect = useCallback(
    async (walletId: string) => {
      setSelectedWallet(walletId)
      const wallet = SUPPORTED_WALLETS.find((w) => w.id === walletId)
      if (!wallet) return

      try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

        if (isMobile && wallet.platforms.includes("ios") || wallet.platforms.includes("android")) {
          setView("connecting")
          const { uri } = await connectWalletConnect()
          openWalletDeepLink(wallet.name, uri)
          return
        }

        setView("qr")
        const { uri, qrDataUrl } = await connectWalletConnect()
        setQrUri(uri)
        setQrDataUrl(qrDataUrl)
      } catch (err) {
        logger.error("WalletConnect connection failed", err)
        toast.error(err instanceof Error ? err.message : "Connection failed")
        setView("list")
      }
    },
    []
  )

  const handleCopyUri = useCallback(async () => {
    if (!qrUri) return
    try {
      await navigator.clipboard.writeText(qrUri)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Connection URI copied to clipboard")
    } catch {
      toast.error("Failed to copy URI")
    }
  }, [qrUri])

  const handleDisconnect = useCallback(() => {
    disconnectWalletConnect()
    setView("list")
    setQrUri("")
    setQrDataUrl("")
    setSelectedWallet(null)
  }, [])

  const handleClose = useCallback(() => {
    if (wcState?.connecting) {
      disconnectWalletConnect()
    }
    setView("list")
    setQrUri("")
    setQrDataUrl("")
    setSelectedWallet(null)
    onClose()
  }, [wcState?.connecting, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === "list" && (
              <>
                <Smartphone className="h-5 w-5" />
                Connect Mobile Wallet
              </>
            )}
            {view === "qr" && (
              <>
                <QrCode className="h-5 w-5" />
                Scan with Wallet
              </>
            )}
            {view === "connecting" && (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Connecting...
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {view === "list" && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Select a wallet to connect via WalletConnect
              </p>
              {SUPPORTED_WALLETS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet.id)}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Connect ${wallet.name} wallet`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {wallet.icon ? (
                      <img
                        src={wallet.icon}
                        alt=""
                        className="h-6 w-6"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    ) : (
                      <WalletIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {wallet.description}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>

            <div className="mt-4 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Don&apos;t see your wallet?{" "}
                <button
                  onClick={() => handleWalletSelect("generic")}
                  className="text-primary underline hover:text-primary/80"
                >
                  Show QR code for any WalletConnect wallet
                </button>
              </p>
            </div>
          </ScrollArea>
        )}

        {view === "qr" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-xl border-2 border-primary/20 bg-white p-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="WalletConnect QR Code"
                  className="h-64 w-64"
                />
              ) : qrUri ? (
                <QRCodeSVG
                  value={qrUri}
                  size={256}
                  level="M"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Scan this QR code with your{" "}
              {selectedWallet
                ? SUPPORTED_WALLETS.find((w) => w.id === selectedWallet)?.name
                : "WalletConnect-compatible"}{" "}
              wallet
            </p>

            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopyUri}
                aria-label="Copy WalletConnect URI"
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy URI"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const wallet = SUPPORTED_WALLETS.find(
                    (w) => w.id === selectedWallet
                  )
                  if (wallet && qrUri) {
                    openWalletDeepLink(wallet.name, qrUri)
                  }
                }}
                disabled={!selectedWallet || !qrUri}
                aria-label="Open wallet app"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open App
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleDisconnect()
                setView("list")
              }}
              className="text-muted-foreground"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel & Choose Another
            </Button>
          </div>
        )}

        {view === "connecting" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <Smartphone className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Opening wallet app...</p>
              <p className="text-sm text-muted-foreground">
                Approve the connection in your wallet
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleDisconnect()
                setView("list")
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}