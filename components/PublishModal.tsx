"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
          <DialogTitle className="text-xl font-bold text-slate-800 mb-4">Publish Game?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-600">
            You are about to publish your game &quot;{gameName}&quot; and will incur the following deductions from your balance.
          </p>
          <div className="space-y-2">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-center gap-2">
              <span className="text-orange-500">💰</span>
              <span className="font-medium">25.43</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <span className="font-medium">CLONE X #1928</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Go Back
            </Button>
            <Button onClick={onPublish} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
