
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hunt Not Found",
  description: "The hunt you are looking for does not exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div role="main" className="min-h-screen bg-stone-950 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6" aria-hidden="true">🌿</div>
        <h1 className="font-display text-3xl font-bold text-cream mb-3">Hunt Not Found</h1>
        <p className="text-stone-500 text-sm mb-8 leading-relaxed font-body">
          This hunt may have moved or doesn&apos;t exist.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="btn-stellar-green-sm">Browse Hunts</Link>
          <Link href="/" className="rounded-xl border border-stone-700 px-5 py-2.5 text-stone-400 text-sm font-semibold hover:text-cream hover:border-stone-500 transition-all">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}