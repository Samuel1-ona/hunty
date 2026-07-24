import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app"

export const metadata: Metadata = {
  title: "Terms of Service | Hunty",
  description: "Read the terms and conditions that govern your use of the Hunty platform.",
  alternates: {
    canonical: `${baseUrl}/terms`,
  },
}

interface Section {
  heading: string
  body: string[]
}

const sections: Section[] = [
  {
    heading: "Acceptance of Terms",
    body: [
      "By accessing or using the Hunty platform (\"Service\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree, do not use the Service.",
      "We may update these Terms at any time. Material changes will be announced via our GitHub repository. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.",
    ],
  },
  {
    heading: "Description of Service",
    body: [
      "Hunty is a decentralized scavenger-hunt platform that allows creators to publish location-based hunts and players to complete those hunts to earn on-chain rewards including XLM tokens and NFTs on the Stellar network.",
      "The platform consists of a web application, a mobile application (iOS and Android), and Soroban smart contracts deployed on the Stellar blockchain.",
    ],
  },
  {
    heading: "Eligibility",
    body: [
      "You must be at least 13 years old to use the Service. By using the Service you represent that you meet this age requirement.",
      "Use of the Service may be restricted in certain jurisdictions. It is your responsibility to ensure that your use of the platform complies with all laws applicable to you.",
    ],
  },
  {
    heading: "Wallet and On-Chain Transactions",
    body: [
      "To participate in hunts and claim rewards you must connect a compatible Stellar wallet (e.g. Freighter). You are solely responsible for the security of your wallet, private keys, and seed phrase. Hunty never has access to your private key.",
      "All on-chain transactions — including reward claims and hunt activations — are irreversible once submitted to the Stellar network. Review every transaction carefully before signing.",
      "Stellar network fees (transaction fees) are your responsibility. Hunty does not reimburse network fees under any circumstances.",
    ],
  },
  {
    heading: "Creator Responsibilities",
    body: [
      "If you create and publish hunts on the platform, you are responsible for the accuracy of hunt content, including clues, answers, and reward configuration.",
      "You must not publish hunts that contain illegal content, infringe third-party intellectual property rights, promote violence or discrimination, or violate any applicable law.",
      "By publishing a hunt you grant Hunty a non-exclusive, royalty-free licence to display and distribute that hunt's content to players through the platform.",
      "You must fund the reward pool before activating a hunt. Hunty does not guarantee that rewards will be available if the reward contract is insufficiently funded.",
    ],
  },
  {
    heading: "Player Conduct",
    body: [
      "You agree to play hunts fairly and not use bots, exploits, or any automated means to submit answers.",
      "Cheating, reverse-engineering smart contracts to extract answers, or manipulating on-chain state to claim rewards you have not legitimately earned is prohibited and may result in permanent exclusion from the platform.",
    ],
  },
  {
    heading: "IPFS Content",
    body: [
      "Hunt media and NFT metadata may be stored on IPFS. Once content is pinned to IPFS it is publicly accessible. Do not upload sensitive or personally identifiable information as hunt or NFT content.",
      "Hunty does not guarantee the long-term availability of IPFS-hosted content and is not liable for content that becomes unavailable.",
    ],
  },
  {
    heading: "Intellectual Property",
    body: [
      "The Hunty name, logo, and platform code are owned by the Hunty project contributors. You may not use them without prior written permission, except as permitted by open-source licences governing the codebase.",
      "User-generated content (hunt text, images, clues) remains the property of the creator. You grant Hunty the licence described in \"Creator Responsibilities\" above.",
    ],
  },
  {
    heading: "Disclaimers",
    body: [
      "THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.",
      "We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components. Blockchain networks are subject to congestion, forks, and other events outside our control.",
      "NFTs and token rewards have no guaranteed monetary value. Hunty makes no representations about the future value of any on-chain asset.",
    ],
  },
  {
    heading: "Limitation of Liability",
    body: [
      "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HUNTY AND ITS CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE, INCLUDING LOSS OF FUNDS, LOST PROFITS, OR DATA LOSS.",
      "Some jurisdictions do not allow the exclusion or limitation of certain damages, so the above limitation may not apply to you.",
    ],
  },
  {
    heading: "Governing Law",
    body: [
      "These Terms are governed by applicable open-source project governance norms. Disputes should first be raised via the project's GitHub issue tracker. In the absence of an agreed alternative, the laws of the jurisdiction in which the primary maintainer resides shall apply.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "Questions about these Terms can be raised via the GitHub repository at github.com/Samuel1-ona/hunty.",
    ],
  },
]

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto space-y-10">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Please read these Terms of Service carefully before using the Hunty platform. They set out the rules that govern
            your relationship with us and your use of the Service.
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
