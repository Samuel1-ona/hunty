import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Home, Search, Trophy, Compass } from "lucide-react";

const SUGGESTIONS = [
  { href: "/", label: "Game Arcade", icon: Compass, desc: "Browse all active hunts" },
  { href: "/dashboard", label: "My Hunts", icon: Trophy, desc: "View hunts you've joined" },
  { href: "/hunty", label: "Create a Hunt", icon: Search, desc: "Start your own challenge" },
];

export const metadata: Metadata = {
  title: "404 - Page Not Found | Hunty",
  description: "The page or hunt you're looking for doesn't exist on Hunty.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-purple-50 to-[#f9f9ff] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex flex-col">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-[#3737A4]/10 dark:bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-[#E87785]/10 dark:bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <Header />

      <main className="relative max-w-3xl mx-auto px-6 pt-24 text-center">
        <h1 className="text-6xl font-extrabold mb-4">404</h1>
        <p className="text-zinc-400 text-lg mb-8">We couldn&apos;t find that hunt.</p>

        <div className="mx-auto max-w-xl">
          <p className="text-zinc-300 mb-6">The hunt you tried to access doesn&apos;t exist or may have been removed.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-5 py-3 rounded-md">
            Return to Game Arcade
          </Link>
        </div>

        {/* Report link */}
        <p className="mt-10 text-xs text-slate-400 dark:text-slate-500">
          Think this is a mistake?{" "}
          <a
            href="https://github.com/Samuel1-ona/hunty/issues/new"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors"
          >
            Report an issue
          </a>
        </p>
      </main>

      <Footer />
    </div>
  );
}