"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Coin from "@/components/icons/Coin"
interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish: () => void
  gameName: string
}

export function PublishModal({ isOpen, onClose, onPublish, gameName }: PublishModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="font-bold bg-gradient-to-b from-[#2D4FEB] to-[#0C0C4F] text-transparent bg-clip-text mb-4 text-center text-2xl">Publish Game?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="bg-gradient-to-b from-[#787884] to-[#576065] text-transparent bg-clip-text text-2xl font-medium">
            You are about to publish your game &quot;{gameName}&quot; and will incur the following deductions from your balance.
          </p>
          <div className="space-y-2">
            <div className="bg-[#e4e4e9] rounded-lg p-3 flex items-center justify-center gap-2u89oo8">
              <span><Coin/></span>
              <span className="font-medium">25.43</span>
            </div>
            <div className="bg-[#e4e4e9] rounded-lg p-3">
              <span className="font-medium">CLONE X #1928</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1 relative overflow-hidden group bg-transparent border-2 border-transparent bg-clip-padding bg-origin-border"
              style={{
                backgroundImage: 'linear-gradient(white, white), linear-gradient(to bottom, #2D4FEB, #0C0C4F)',
                backgroundClip: 'padding-box, border-box',
                backgroundOrigin: 'border-box',
              }}
            >
              <span className="bg-gradient-to-b from-[#2D4FEB] to-[#0C0C4F] text-transparent bg-clip-text text-xl font-medium cursor-pointer">
                Go Back
              </span>
            </Button>
            <Button onClick={onPublish} className="flex-1 bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 text-white text-xl cursor-pointer">
              Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
