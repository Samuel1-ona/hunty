"use client"

import { NextIntlClientProvider, useLocale, useTranslations } from "next-intl"
import { useRouter, usePathname } from "next/navigation"
import { Globe } from "lucide-react"
import { routing } from "@/i18n/routing"

const LOCALE_FLAGS: Record<string, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
}

// Minimal messages used when the component renders outside a locale layout
// (e.g. the root not-found page).  The locale layout will provide its own
// full message set that takes precedence.
const FALLBACK_MESSAGES = {
  settings: { selectLanguage: "Select Language" },
  language: { en: "English", es: "Español" },
}

function LanguageSelectorCore() {
  const locale = useLocale()
  const t = useTranslations("settings")
  const tLang = useTranslations("language")
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = (newLocale: string) => {
    // Replace the locale segment in the current path.
    // Locale-prefixed paths look like /en/... or /es/...
    const segments = pathname.split("/")
    if (routing.locales.includes(segments[1] as "en" | "es")) {
      segments[1] = newLocale
    } else {
      segments.splice(1, 0, newLocale)
    }
    router.push(segments.join("/"))
  }

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" aria-hidden="true" />
      <select
        value={locale}
        onChange={(e) => handleLocaleChange(e.target.value)}
        aria-label={t("selectLanguage")}
        className="appearance-none bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3737A4]/50 rounded pr-4"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc} className="bg-white dark:bg-slate-900">
            {LOCALE_FLAGS[loc]} {tLang(loc as "en" | "es")}
          </option>
        ))}
      </select>
      {/* Chevron */}
      <svg
        className="pointer-events-none absolute right-0 w-3 h-3 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

/**
 * Language selector component.
 *
 * Works both inside and outside of a NextIntlClientProvider.  When rendered
 * inside a locale layout the parent provider's locale/messages are used.
 * When rendered outside (e.g. the root not-found page) the bundled fallback
 * messages keep the component functional.
 */
export function LanguageSelector() {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={FALLBACK_MESSAGES}
      // Suppress missing-message warnings — parent provider messages take
      // precedence at runtime when available.
      onError={() => undefined}
    >
      <LanguageSelectorCore />
    </NextIntlClientProvider>
  )
}
