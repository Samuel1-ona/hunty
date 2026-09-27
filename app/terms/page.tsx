import Link from "next/link"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { ArrowLeft, FileText } from "lucide-react"

export const metadata = {
  title: "Terms of Service — Hunty",
  description: "The terms that govern your use of Hunty.",
}

const LAST_UPDATED = "June 2025"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="max-w-[1600px] px-6 sm:px-14 pt-10 pb-12 bg-white dark:bg-slate-900 mx-auto rounded-4xl mt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#3737A4] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Arcade
        </Link>

        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <FileText className="w-10 h-10 text-[#3737A4] dark:text-blue-300" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-100 mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert prose-headings:font-semibold prose-a:text-[#3737A4] dark:prose-a:text-blue-300">
          <p>
            By accessing or using the Hunty application or website (&ldquo;Service&rdquo;)
            you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do
            not agree, do not use the Service.
          </p>

          <h2>1. The Service</h2>
          <p>
            Hunty is a blockchain-powered treasure hunt platform built on the
            Stellar network. It lets users discover hunts, solve clues, scan QR
            codes, and compete for XLM and NFT rewards distributed via Soroban
            smart contracts.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 13 years old to use the Service. By using the
            Service you represent that you meet this requirement.
          </p>

          <h2>3. Wallet & Blockchain Transactions</h2>
          <ul>
            <li>
              You are solely responsible for your Stellar wallet and private keys.
              Hunty never has access to your private key or seed phrase.
            </li>
            <li>
              On-chain transactions are irreversible. Hunty is not liable for
              transactions submitted in error or funds lost due to wallet
              mis-configuration.
            </li>
            <li>
              Reward distributions are governed by on-chain Soroban contracts.
              Hunty does not guarantee reward availability or contract execution
              outcomes.
            </li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Cheat, exploit bugs, or use automated tools to gain unfair advantages in hunts.</li>
            <li>Tamper with QR codes or physical hunt infrastructure.</li>
            <li>Attempt to hack, reverse-engineer, or disrupt the Service.</li>
            <li>Violate any applicable laws or regulations.</li>
          </ul>
          <p>
            Violation of these rules may result in immediate account suspension
            and forfeiture of rewards.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            All non-blockchain content of the Service — including the Hunty name,
            logo, interface design, and hunt content created by us — is owned by
            Hunty and may not be reproduced without permission. Hunt content
            created by third-party creators remains their property.
          </p>

          <h2>6. User Content</h2>
          <p>
            If you create hunts or submit content through the Service you grant
            Hunty a non-exclusive, worldwide, royalty-free licence to display and
            distribute that content as part of the Service.
          </p>

          <h2>7. Disclaimers</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; without warranties of any kind. We do
            not guarantee uptime, reward outcomes, or the accuracy of third-party
            blockchain data. Cryptocurrency values are volatile; participation in
            hunts does not constitute financial advice.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Hunty&apos;s total liability to
            you for any claim arising from use of the Service is limited to the
            amount you paid us (if any) in the 12 months preceding the claim.
            Hunty is not liable for indirect, incidental, or consequential damages.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which
            Hunty is incorporated, without regard to conflict-of-law principles.
          </p>

          <h2>10. Changes to These Terms</h2>
          <p>
            We may update these Terms at any time. We will post the new version
            here with an updated &ldquo;Last updated&rdquo; date. Continued use of the
            Service after changes constitutes acceptance of the new Terms.
          </p>

          <h2>11. Contact</h2>
          <p>
            Questions about these Terms?{" "}
            <a href="mailto:legal@hunty.io">legal@hunty.io</a> or visit our{" "}
            <Link href="/help">Help page</Link>.
          </p>

          <hr />
          <p className="text-sm text-slate-500">
            By using Hunty you also agree to our{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
