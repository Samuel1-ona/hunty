"use client"

import React, { forwardRef } from "react"
import { Trophy, Star, ShieldCheck } from "lucide-react"

interface AchievementCertificateProps {
  playerName?: string
  huntTitle?: string
  rank?: number
  points?: number
}

export const AchievementCertificate = forwardRef<HTMLDivElement, AchievementCertificateProps>(
  ({ playerName = "Stellar Explorer", huntTitle = "Scavenger Hunt", rank = 1, points = 100 }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[600px] h-[400px] bg-[#0C0C4F] text-white p-1 relative overflow-hidden flex flex-col items-center justify-center border-8 border-amber-500/30"
        style={{
          background: "radial-gradient(circle at center, #1a1a7a 0%, #0C0C4F 100%)",
        }}
      >
        {/* Background Decorations */}
        <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
        
        {/* Border Inner Line */}
        <div className="absolute inset-2 border border-amber-500/20 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-12">
          {/* Logo/Icon */}
          <div className="mb-4">
            <div className="bg-gradient-to-br from-amber-400 to-orange-600 p-3 rounded-full shadow-lg shadow-amber-500/20">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-sm font-bold tracking-[0.3em] uppercase text-amber-400 mb-2">
            Certificate of Achievement
          </h1>

          <div className="w-16 h-[1px] bg-amber-500/30 mb-6" />

          <p className="text-slate-300 text-xs mb-1">This certifies that</p>
          <h2 className="text-3xl font-bold bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent mb-4">
            {playerName}
          </h2>

          <p className="text-slate-300 text-xs mb-4">
            successfully completed the hunt
          </p>
          
          <h3 className="text-xl font-bold text-amber-100 mb-6 italic">
            &ldquo;{huntTitle}&rdquo;
          </h3>

          <div className="grid grid-cols-2 gap-8 w-full max-w-sm border-t border-b border-white/10 py-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Rank</p>
              <div className="flex items-center justify-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-lg font-bold">#{rank}</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Points</p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-lg font-bold">{points}</span>
                <span className="text-[10px] text-slate-400">PTS</span>
              </div>
            </div>
          </div>

          {/* Footer Seals */}
          <div className="mt-8 flex items-center gap-4 text-[9px] text-slate-500 font-mono">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              VERIFIED ON SOROBAN
            </div>
            <div className="w-1 h-1 bg-slate-700 rounded-full" />
            <div>HUNTY.APP</div>
          </div>
        </div>

        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500/40" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-500/40" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-500/40" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-500/40" />
      </div>
    )
  },
)

AchievementCertificate.displayName = "AchievementCertificate"
