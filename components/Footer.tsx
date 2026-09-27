import Link from "next/link"
import { HelpCircle } from "lucide-react"

export function Footer() {
  return (
    <footer aria-label="Site footer" className="max-w-[1600px] mx-auto px-6 sm:px-14 py-8 mt-12 border-t border-slate-100 dark:border-white/5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
        <div className="font-normal text-lg bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent">
          Hunty
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 hover:text-[#3737A4] dark:hover:text-blue-300 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Help & Troubleshooting
          </Link>
          <Link
            href="/privacy"
            className="hover:text-[#3737A4] dark:hover:text-blue-300 transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="hover:text-[#3737A4] dark:hover:text-blue-300 transition-colors"
          >
            Terms of Service
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Hunty. All rights reserved.</p>
      </div>
    </footer>
  )
}
