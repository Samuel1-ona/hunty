import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"
import { hankenGrotesk } from "@/lib/font"
import { TxToaster } from "@/components/TxToaster"
import Providers from "../providers"
import "../globals.css"

// RTL locales — add Arabic, Hebrew, Farsi, etc. here when supported
const RTL_LOCALES: string[] = []

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "home" })

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: ["scavenger hunt", "game", "blockchain", "Stellar", "XLM", "NFT", "Web3"],
    authors: [{ name: "Hunty Team" }],
    openGraph: {
      type: "website",
      locale: locale === "es" ? "es_ES" : "en_US",
      url: "https://hunty.app",
      siteName: "Hunty",
      title: t("metaTitle"),
      description: t("metaDescription"),
      images: [
        {
          url: "https://hunty.app/og-image.png",
          width: 1200,
          height: 630,
          alt: t("metaTitle"),
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaTitle"),
      description: t("metaDescription"),
      images: ["https://hunty.app/og-image.png"],
      creator: "@huntyapp",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical: `https://hunty.app/${locale}`,
      languages: {
        en: "https://hunty.app/en",
        es: "https://hunty.app/es",
      },
    },
  }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as "en" | "es")) {
    notFound()
  }

  // Providing all messages to the client
  const messages = await getMessages()

  const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr"

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.classList.add(theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${hankenGrotesk.variable} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <a href="#main-content" className="skip-to-content">
              Skip to content
            </a>
            <TxToaster />
            <main id="main-content">
              {children}
            </main>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
