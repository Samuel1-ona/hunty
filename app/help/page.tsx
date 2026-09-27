"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { ChevronDown, ChevronUp, Wallet, Gamepad2, Trophy, ShieldQuestion, ArrowLeft } from "lucide-react"

interface FAQItem {
  question: string
  answer: string
}

const walletIssues: FAQItem[] = [
  {
    question: "How do I connect my wallet?",
    answer:
      "Click the \"Connect Wallet\" button in the top-right corner of the page. Select your preferred wallet provider (e.g. Freighter) from the modal that appears. Make sure your wallet extension is installed and unlocked before attempting to connect.",
  },
  {
    question: "My wallet won't connect. What should I do?",
    answer:
      "First, ensure your wallet extension (e.g. Freighter) is installed and up to date. Try refreshing the page and attempting again. If the issue persists, try disconnecting from other dApps, clearing your browser cache, or switching to a different browser.",
  },
  {
    question: "How do I check my balance?",
    answer:
      "Once your wallet is connected, your balance is displayed in the header next to the coin icon. This shows your current XLM balance available for use in hunts.",
  },
  {
    question: "I sent funds but my balance hasn't updated.",
    answer:
      "Stellar transactions typically confirm within 5 seconds. Try refreshing the page. If your balance still hasn't updated, check the transaction on a Stellar block explorer using your wallet address to verify it went through.",
  },
]

const gameIssues: FAQItem[] = [
  {
    question: "How do I play a hunt?",
    answer:
      "Browse the active hunts on the Game Arcade (home page) and click on one that interests you. Each hunt has a series of clues to solve. Enter your answer for each clue in the input field and submit. Solve all clues to complete the hunt and claim your reward!",
  },
  {
    question: "What are hunt rewards?",
    answer:
      "Hunts can offer XLM (Stellar Lumens), NFTs, or both as rewards. The reward type is shown on each hunt card. Rewards are distributed to players who successfully complete the hunt.",
  },
  {
    question: "How do I create my own hunt?",
    answer:
      'Click the "Create Game" button on the home page or navigate to /hunty. Fill in the hunt details including title, description, clues, and reward configuration. You can save it as a draft and activate it when ready.',
  },
  {
    question: "My game link isn't working.",
    answer:
      "Make sure you're entering the complete game link in the correct format. The hunt may have been deactivated by its creator, or it may be a private hunt that requires a direct invitation link.",
  },
  {
    question: "Can I edit a hunt after creating it?",
    answer:
      'Yes, you can edit hunts that are still in "Draft" status from your Dashboard. Once a hunt is activated, certain fields may be locked to ensure fairness for players who have already started.',
  },
]

const leaderboardIssues: FAQItem[] = [
  {
    question: "How does the leaderboard work?",
    answer:
      "The leaderboard ranks players based on their performance across hunts. Points are awarded for completing clues and finishing hunts. Faster completion times may earn bonus points.",
  },
  {
    question: "Why don't I see my score on the leaderboard?",
    answer:
      "You need to have completed at least one hunt for your score to appear. Make sure your wallet is connected — scores are tied to your wallet address. It may also take a moment for scores to update after completing a hunt.",
  },
]

const generalIssues: FAQItem[] = [
  {
    question: "Is Hunty free to use?",
    answer:
      "Browsing and playing hunts is free. Creating hunts that offer rewards requires funding the reward pool. Standard Stellar network fees apply for on-chain transactions.",
  },
  {
    question: "Which browsers are supported?",
    answer:
      "Hunty works best on the latest versions of Chrome, Firefox, Brave, and Edge. Make sure JavaScript is enabled and your wallet extension is compatible with your browser.",
  },
  {
    question: "How do I report a bug or get further help?",
    answer:
      "You can report issues on our GitHub repository at github.com/Samuel1-ona/hunty. For urgent help, reach out to the team through the channels listed on the repo.",
  },
]

function FAQSection({
  title,
  icon,
  items,
}: {
  title: string
  icon: React.ReactNode
  items: FAQItem[]
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-100">
          {title}
        </h2>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800"
          >
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full flex items-center justify-between px-5 py-4 text-left text-sm md:text-base font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <span>{item.question}</span>
              {openIndex === idx ? (
                <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
              )}
            </button>
            {openIndex === idx && (
              <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] dark:from-slate-900 dark:bg-slate-900 dark:to-slate-800 pb-[75px]">
      <Header />

      <div className="max-w-[1600px] px-6 sm:px-14 pt-10 pb-12 bg-white dark:bg-slate-900 mx-auto rounded-4xl">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#3737A4] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Arcade
        </Link>

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-100 mb-4">
            Troubleshooting Guide
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
            Find answers to common questions about wallets, gameplay, and more.
            Can&apos;t find what you&apos;re looking for? Report an issue on our GitHub.
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="max-w-3xl mx-auto">
          <FAQSection
            title="Wallet Issues"
            icon={<Wallet className="w-6 h-6 text-[#3737A4]" />}
            items={walletIssues}
          />
          <FAQSection
            title="Gameplay"
            icon={<Gamepad2 className="w-6 h-6 text-[#3737A4]" />}
            items={gameIssues}
          />
          <FAQSection
            title="Leaderboard & Scores"
            icon={<Trophy className="w-6 h-6 text-[#3737A4]" />}
            items={leaderboardIssues}
          />
          <FAQSection
            title="General"
            icon={<ShieldQuestion className="w-6 h-6 text-[#3737A4]" />}
            items={generalIssues}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}
