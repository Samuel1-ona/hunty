"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Coin from "@/components/icons/Coin"
import Replay from "@/components/icons/Replay"
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
          <DialogTitle className="bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent text-2xl font-bold mb-4 text-center">Game Complete</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="bg-gradient-to-b from-[#576065] to-[#787884] bg-clip-text text-transparent text-2xl font-normal">You successfully completed TDH's Crossword</p>
          <div className="flex items-center justify-center gap-2 text-2xl">
            <span>🥇</span>
            <span className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent text-2xl font-bold">1st Place</span>
          </div>

          <div className="flex items-center justify-center gap-2 w-full">
            <p className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent text-xl font-normal  mb-2">You won</p>
            <div className="flex items-center justify-center gap-2 bg-[#e5e5eb] p-2 rounded-xl w-[230px]">
              <Coin />
              <span className="font-bold text-lg">{reward}</span>
            </div>
          </div>
         
          <div className="flex gap-4">
            <div className="flex-1 p-[2px] bg-gradient-to-br from-[#4A4AFF] to-[#0C0C4F] rounded-xl">
            <Button
              onClick={onGoHome}
              variant="outline"
              className="w-full h-full bg-white border-none shadow-none rounded-xl"
              style={{ background: 'white' }}
            >
              <span className="bg-gradient-to-br from-[#4A4AFF] to-[#0C0C4F] bg-clip-text text-transparent font-bold cursor-pointer">
                Go Home
              </span>
            </Button>
          </div>
            <Button onClick={onReplay} className="flex-1 bg-gradient-to-br from-[#E3225C] to-[#7B1C4A] hover:bg-pink-600 text-white cursor-pointer rounded-xl">
              <Replay /> Replay
            </Button>
          </div>
          <Button onClick={onViewLeaderboard} className="w-full bg-gradient-to-b from-[#FFD43E] to-[#EC7F00] text-white text-xl font-black cursor-pointer rounded-xl">
            See Leaderboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
