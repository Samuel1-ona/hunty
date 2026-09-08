"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  HelpCircle,
  Mail,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";


const footerSections = [
  {
    title: "Explore",
    links: [
      { label: "Game Arcade", href: "/" },
      { label: "Create Game", href: "/hunty" },
      { label: "Hunt Templates", href: "/hunty/templates" },
      { label: "Leaderboard", href: "/?tab=leaderboard" },
    ],
  },
  {
    title: "Player",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Profile", href: "/profile" },
      { label: "Creator Hub", href: "/creator" },
      { label: "Help Center", href: "/help" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "FAQ", href: "/help" },
    ],
  },
];

const socialLinks = [
  {
    label: "Twitter",
    href: "https://twitter.com/huntyapp",
    icon: MessageCircle,
  },
  {
    label: "Discord",
    href: "https://discord.gg/hunty",
    icon: ShieldCheck,
  },
  {
    label: "Telegram",
    href: "https://t.me/huntyapp",
    icon: Send,
  },
];

export function Footer() {
  const t = useTranslations("footer")
  const commonT = useTranslations("common")
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) return;

    setIsSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-white/90 text-slate-700 dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-300">
      <div className="mx-auto max-w-[1600px] px-6 py-10 sm:px-14 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr_1.25fr] lg:gap-12">
          <div className="space-y-5">
            <Link
              href="/"
              className="inline-flex text-2xl font-semibold bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent"
            >
              Hunty
            </Link>
            <p className="max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">
              {t("description")}
              Create, discover, and complete Web3 scavenger hunts powered by Stellar rewards.
            </p>
            <Link
              href="https://stellar.org"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-[#3737A4]/20 bg-[#3737A4]/10 px-3 py-1.5 text-xs font-semibold text-[#3737A4] transition-colors hover:bg-[#3737A4]/15 dark:border-blue-300/20 dark:bg-blue-300/10 dark:text-blue-200"
              aria-label="Built on Stellar"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("builtOnStellar")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <nav className="grid grid-cols-1 gap-8 sm:grid-cols-3" aria-label="Footer navigation">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {section.title}
                </h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex text-slate-600 transition-colors hover:text-[#3737A4] dark:text-slate-400 dark:hover:text-blue-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("stayInHunt")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t("getUpdates")}
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3 sm:max-w-md">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="footer-email"
                    type="email"
                    required
                    aria-label="Email address"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setIsSubscribed(false);
                    }}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#3737A4] focus:ring-2 focus:ring-[#3737A4]/20 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Subscribe to updates"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0C0C4F] px-4 text-sm font-bold text-white transition hover:bg-[#3737A4] focus:outline-none focus:ring-2 focus:ring-[#3737A4]/40"
                >
                  {t("subscribe")}
                </button>
              </div>
              {isSubscribed && (
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="h-4 w-4" />
                  {t("thanksForSubscribing")}
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-5 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <p>&copy; {new Date().getFullYear()} {commonT("appName")}. {t("rights")}</p>
            <Link
              href="/help"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#3737A4] dark:hover:text-blue-300"
            >
              <HelpCircle className="h-4 w-4" />
              {t("helpAndTroubleshooting")}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-[#3737A4]/40 hover:text-[#3737A4] dark:border-white/10 dark:text-slate-300 dark:hover:border-blue-300/40 dark:hover:text-blue-300"
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
