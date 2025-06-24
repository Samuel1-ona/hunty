"use client"

import { Button } from "@/components/ui/button"

interface CreateGameTabsProps {
  activeTab: "create" | "rewards" | "publish" | "leaderboard"
  onTabChange: (tab: "create" | "rewards" | "publish" | "leaderboard") => void
}

export function CreateGameTabs({ activeTab, onTabChange }: CreateGameTabsProps) {
  const tabs = [
    { id: "create", label: "Create" },
    { id: "rewards", label: "Rewards" },
    { id: "publish", label: "Publish" },
    { id: "leaderboard", label: "Leaderboard" },
  ] as const

  return (
    <div className="flex gap-3 mb-8 w-full">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-6 py-3 rounded-xl ${
            activeTab === tab.id ? "bg-[#0C0C4F] font-extrabold text-white" : "bg-gray-400 text-white hover:bg-gray-500 font-extrabold" 
          }`}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  )
}
