'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check } from 'lucide-react'

export default function ToggleButton() {
  const [enabled, setEnabled] = useState(false)

  return (
    <div className="relative w-20 h-10">
      <div 
        onClick={() => setEnabled(!enabled)}
        className={`w-full h-full rounded-2xl cursor-pointer p-0.5 transition-all duration-300 ${
          enabled 
            ? 'bg-gradient-to-b from-[#A43751] to-[#4F0C14]' // Red gradient for ON
            : 'bg-gradient-to-b from-[#39A437] to-[#194F0C]' // Green gradient for OFF
        }`}
      >
        <div className="w-full h-full bg-white rounded-xl overflow-hidden">
          <motion.div
            animate={{ x: enabled ? '100%' : '0%' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`w-1/2 h-full rounded-xl flex items-center justify-center ${
              enabled 
                ? 'bg-gradient-to-b from-[#A43751] to-[#4F0C14]' // Red gradient for ON
                : 'bg-gradient-to-b from-[#39A437] to-[#194F0C]' // Green gradient for OFF
            }`}
          >
            {enabled ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17L4 12"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </motion.div>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <div className={`flex-1 flex justify-center ${enabled ? 'text-gray-800' : 'text-gray-400'}`}>
          <Check className="w-4 h-4" />
        </div>
        <div className={`flex-1 flex justify-center ${!enabled ? 'text-gray-800' : 'text-gray-400'}`}>
          <X className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}