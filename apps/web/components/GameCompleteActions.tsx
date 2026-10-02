import { Button } from "@/components/ui/button"
import Replay from "@/components/icons/Replay"

interface GameCompleteActionsProps {
  onGoHome: () => void
  onReplay: () => void
}

export function GameCompleteActions({ onGoHome, onReplay }: GameCompleteActionsProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-1 p-[2px] bg-gradient-to-br from-[#4A4AFF] to-[#0C0C4F] rounded-xl">
        <Button
          onClick={onGoHome}
          variant="outline"
          className="w-full h-full bg-white border-none shadow-none rounded-xl"
          style={{ background: "white" }}
        >
          <span className="bg-gradient-to-br from-[#4A4AFF] to-[#0C0C4F] bg-clip-text text-transparent font-bold cursor-pointer">
            Go Home
          </span>
        </Button>
      </div>
      <Button
        onClick={onReplay}
        className="flex-1 bg-gradient-to-br from-[#E3225C] to-[#7B1C4A] hover:bg-pink-600 text-white cursor-pointer rounded-xl"
      >
        <Replay /> Replay
      </Button>
    </div>
  )
}
