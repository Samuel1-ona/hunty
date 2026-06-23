import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-24">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
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
      </main>
    </div>
  );
}
