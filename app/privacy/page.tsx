import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app"

export const metadata: Metadata = {
  title: "Privacy Policy | Hunty",
  description: "Learn how Hunty collects, uses, and protects your information.",
  alternates: {
    canonical: `${baseUrl}/privacy`,
  },
}

interface Section {
  heading: string
  body: string[]
}

const sections: Section[] = [
  {
    heading: "Information We Collect",
    body: [
      "Hunty is a decentralized application. We do not create accounts or store passwords. The primary identifier used across the platform is your public Stellar wallet address, which you provide by connecting a wallet (e.g. Freighter).",
      "When you interact with hunts we may record your wallet address, timestamps of hunt attempts, answers submitted, and completion status. This data is necessary to operate leaderboards and reward distribution.",
      "If you contact us for support, we may retain the content of that communication solely to resolve your inquiry.",
    ],
  },
  {
    heading: "How We Use Your Information",
    body: [
      "Hunt progress and completion data is used to display leaderboards, calculate rewards, and show you your own history.",
      "Wallet addresses are used to send on-chain rewards (XLM tokens and NFTs) via Stellar smart contracts.",
      "We do not sell, rent, or share your information with third-party advertisers.",
    ],
  },
  {
    heading: "On-Chain Data",
    body: [
      "Stellar blockchain transactions are public by nature. Any transaction made through Hunty — including reward claims and hunt activations — is permanently recorded on the Stellar network and visible to anyone.",
      "Hunty has no ability to alter or delete on-chain records. Please review each transaction before signing.",
    ],
  },
  {
    heading: "IPFS-Hosted Content",
    body: [
      "Hunt media, NFT metadata, and other assets may be stored on IPFS (InterPlanetary File System). Content pinned to IPFS is publicly accessible by anyone with the content identifier (CID).",
      "Do not upload personally identifiable information as part of hunt media or NFT assets.",
    ],
  },
  {
    heading: "Cookies and Local Storage",
    body: [
      "We use browser local storage to persist your theme preference and session state. No tracking cookies are set.",
      "We do not use analytics SDKs that fingerprint individual users.",
    ],
  },
  {
    heading: "Third-Party Services",
    body: [
      "Hunty may integrate with third-party wallet providers (Freighter, WalletConnect). Your use of those services is governed by their respective privacy policies.",
      "IPFS access may be routed through public gateways operated by third parties. Please review the privacy policies of any gateway you use directly.",
    ],
  },
  {
    heading: "Data Retention",
    body: [
      "Off-chain hunt data (progress, leaderboard entries) is retained for as long as the platform is operational. You may request deletion of off-chain records associated with your wallet address by contacting us on our GitHub repository.",
      "On-chain data cannot be deleted by Hunty or by you, as it is part of the immutable Stellar ledger.",
    ],
  },
  {
    heading: "Children's Privacy",
    body: [
      "Hunty is not directed to children under 13. We do not knowingly collect information from children. If you believe a child has provided us with information, please contact us and we will take appropriate action.",
    ],
  },
  {
    heading: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. Material changes will be announced via our GitHub repository. Continued use of the platform after changes constitutes acceptance of the updated policy.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "Questions about this Privacy Policy can be directed to the project maintainers via the GitHub repository at github.com/Samuel1-ona/hunty.",
    ],
  },
]

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto space-y-10">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Hunty (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the Hunty decentralized scavenger-hunt platform
            at <span className="font-medium text-slate-800 dark:text-slate-200">hunty.app</span>.
            This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.
            By using the platform you agree to the practices described here.
          </p>

          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-100 mb-3">
                {section.heading}
              </h2>
              <div className="space-y-3">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm md:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}
