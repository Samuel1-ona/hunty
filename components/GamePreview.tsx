"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, ArrowRight } from "lucide-react"
import Image from "next/image"
import PlayCircle from "@/components/icons/PlayCircle"

interface Hunt {
  id: number
  title: string
  description: string
  link: string
  code: string
}

interface GamePreviewProps {
  hunts: Hunt[]
}

export function GamePreview({ hunts }: GamePreviewProps) {
  return (
    <div className="bg-[#ececfa] backdrop-blur-md rounded-2xl p-6 border border-white/20" style={{boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'}}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[16px] font-normal text-[#808080]">Live Preview</span>
        <div className="flex gap-2">
          <Button size="sm" className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 text-white px-3 py-[6px] rounded-xl text-sm font-semibold">
          <Eye /> Reveal
          </Button>
          <Button size="sm" className="bg-gradient-to-br from-[#2F2FFF] to-[#E87785] hover:bg-purple-700 text-white px-3 py-[6px] rounded-xl text-sm font-semibold">
            <PlayCircle /> Test
          </Button>
        </div>
      </div>

      <div className="">
        {hunts.slice(0, 2).map((hunt, index) => (
          <div
            key={hunt.id}
            className={`rounded-tl-2xl rounded-tr-2xl p-4 text-white bg-gradient-to-b from-[#3737A4] to-[#0C0C4F]`}
          >
            <div className="text-right text-[#B3B3E5] text-sm mb-2">{index + 1}/10</div>
            <h3 className="text-lg font-bold mb-2">
              {hunt.title || (index === 0 ? "Title of the hunt" : "What is the fastets bird?")}
            </h3>
            <p className="text-sm opacity-90 mb-4">
              {hunt.description ||
                (index === 0
                  && "Description")}
            </p>
            {index === 0 ? (
             ""
            ) : (
             <Image src={hunt.link} alt="Logo" width={96} height={96} />
            )}
          </div>
        ))}

        <div className="bg-white flex gap-2 p-6 rounded-bl-2xl rounded-br-2xl">
          <Input placeholder="Enter code to unlock" className="flex-1 px-4 py-2 rounded-full" />
          <Button className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] hover:bg-purple-700 text-white px-6 py-2 rounded-xl"><ArrowRight className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  )
}
