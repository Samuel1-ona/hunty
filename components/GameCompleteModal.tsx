"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface GameCompleteModalProps {
  isOpen: boolean
  onClose: () => void
  onGoHome: () => void
  onReplay: () => void
  onViewLeaderboard: () => void
  reward: number
}

export function GameCompleteModal({
  isOpen,
  onClose,
  onGoHome,
  onReplay,
  onViewLeaderboard,
  reward,
}: GameCompleteModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-600 mb-4">Game Complete</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-600">You successfully completed TDH's Crossword</p>
          <div className="flex items-center justify-center gap-2 text-2xl">
            <span>🥇</span>
            <span className="font-bold text-orange-500">1st Place</span>
          </div>
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">You won</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-orange-500">💰</span>
              <span className="font-bold text-lg">{reward}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={onGoHome} variant="outline" className="flex-1">
              Go Home
            </Button>
            <Button onClick={onReplay} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white">
              🔄 Replay
            </Button>
          </div>
          <Button onClick={onViewLeaderboard} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            See Leaderboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
