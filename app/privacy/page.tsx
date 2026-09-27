import Link from "next/link"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { ArrowLeft, Shield } from "lucide-react"

export const metadata = {
  title: "Privacy Policy — Hunty",
  description: "How Hunty collects, uses, and protects your data.",
}

const LAST_UPDATED = "June 2025"

export default function PrivacyPage() {
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
            <Shield className="w-10 h-10 text-[#3737A4] dark:text-blue-300" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-100 mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert prose-headings:font-semibold prose-a:text-[#3737A4] dark:prose-a:text-blue-300">
          <p>
            Hunty (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) respects your privacy. This policy
            explains what data we collect when you use the Hunty app or website
            (&ldquo;Service&rdquo;) and how we use it.
          </p>

          <h2>1. Information We Collect</h2>
          <h3>1.1 Information you provide</h3>
          <ul>
            <li>
              <strong>Wallet address</strong> — when you connect a Stellar wallet
              (xBull, Lobstr, Freighter) we read your public key to display your
              balance and attribute hunt completions. We never access your private
              key or seed phrase.
            </li>
            <li>
              <strong>Hunt submissions</strong> — answers you submit to hunt clues
              and QR-code scans are recorded on-chain via Soroban smart contracts.
            </li>
          </ul>

          <h3>1.2 Information collected automatically</h3>
          <ul>
            <li>
              <strong>Location data</strong> — the mobile app requests foreground
              location access to show nearby clue zones on the map. Location is
              used only while the app is open and is not stored on our servers.
            </li>
            <li>
              <strong>Device information</strong> — OS version, device model, and
              app version for crash diagnostics via Sentry.
            </li>
            <li>
              <strong>Usage analytics</strong> — anonymised event data (screens
              visited, hunt interactions) to improve the product.
            </li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To operate and improve the Hunty Service.</li>
            <li>To process on-chain reward distributions via Soroban.</li>
            <li>To display leaderboards tied to your public wallet address.</li>
            <li>To diagnose crashes and monitor service health.</li>
            <li>To send push notifications about hunts you have joined (opt-in).</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>

          <h2>3. Blockchain Data</h2>
          <p>
            Hunt completions, reward claims, and leaderboard scores are recorded on
            the Stellar blockchain and are public and immutable by design. Any data
            submitted to a Soroban contract cannot be deleted by Hunty or by you.
          </p>

          <h2>4. Data Sharing</h2>
          <p>We share data only with:</p>
          <ul>
            <li>
              <strong>Sentry</strong> — crash and error reporting. Sentry may
              receive device information and anonymised stack traces.
            </li>
            <li>
              <strong>Expo / EAS</strong> — over-the-air update delivery and build
              infrastructure.
            </li>
            <li>
              <strong>Law enforcement</strong> — if required by applicable law.
            </li>
          </ul>

          <h2>5. Data Retention</h2>
          <p>
            Server-side session data is retained for 90 days. Crash reports are
            retained for 30 days. On-chain data is permanent.
          </p>

          <h2>6. Your Rights</h2>
          <p>
            Depending on your jurisdiction you may have the right to access,
            correct, or delete personal data we hold. To submit a request, email{" "}
            <a href="mailto:privacy@hunty.io">privacy@hunty.io</a>.
          </p>

          <h2>7. Children&apos;s Privacy</h2>
          <p>
            The Service is not directed at children under 13. We do not knowingly
            collect personal data from children under 13. If you believe a child
            has provided us data, contact{" "}
            <a href="mailto:privacy@hunty.io">privacy@hunty.io</a>.
          </p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will post the new
            version here with an updated &ldquo;Last updated&rdquo; date. Continued
            use of the Service after changes constitutes acceptance of the new
            policy.
          </p>

          <h2>9. Contact</h2>
          <p>
            Questions about this policy?{" "}
            <a href="mailto:privacy@hunty.io">privacy@hunty.io</a> or visit our{" "}
            <Link href="/help">Help page</Link>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
