import type { Metadata, Viewport } from "next"
import { Suspense } from "react"

import "./globals.css"
import { hankenGrotesk } from "@/lib/font"
import { TxToaster } from "@/components/TxToaster"
import { PageSkeleton } from "@/components/PageSkeleton"
import { PageTransitionWrapper } from "@/components/PageTransitionWrapper"
import Providers from "./providers"
import PWAInstallPrompt from "@/components/PWAInstallPrompt"
import { PageSkeleton } from "@/components/PageSkeleton"
import { PageTransitionWrapper } from "@/components/PageTransitionWrapper"

export const viewport: Viewport = {
  themeColor: "#7c3aed",
}

export const metadata: Metadata = {
  title: "Hunty - Decentralized Scavenger Hunt Game",
  description: "Create thrilling scavenger hunts with multiple clues and challenges. Engage players in immersive treasure hunts and reward them with XLM tokens or exclusive NFTs on the Stellar blockchain.",
  keywords: ["scavenger hunt", "game", "blockchain", "Stellar", "XLM", "NFT", "Web3"],
  authors: [{ name: "Hunty Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hunty",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://hunty.app",
    siteName: "Hunty",
    title: "Hunty - Decentralized Scavenger Hunt Game",
    description: "Create thrilling scavenger hunts with multiple clues and challenges. Engage players in immersive treasure hunts and reward them with XLM tokens or exclusive NFTs on the Stellar blockchain.",
    images: [
      {
        url: "https://hunty.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Hunty - Decentralized Scavenger Hunt Game",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hunty - Decentralized Scavenger Hunt Game",
    description: "Create thrilling scavenger hunts with multiple clues and challenges. Engage players in immersive treasure hunts and reward them with XLM tokens or exclusive NFTs on the Stellar blockchain.",
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
    canonical: "https://hunty.app",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const nonce = headersList.get("x-nonce") || undefined

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.classList.add(theme);
              } catch (e) {}
            `,
          }}
        />
        {/* Apple splash screen meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Hunty" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
        {/* Splash screen for various iPhone sizes */}
        <meta name="msapplication-TileColor" content="#7c3aed" />
        <meta name="msapplication-TileImage" content="/icons/icon-192x192.png" />
      </head>
      <body className={`${hankenGrotesk.variable} antialiased`} suppressHydrationWarning>
        <Providers>
          <a href="#main-content" className="skip-to-content">
            Skip to content
          </a>
          <TxToaster />
          <PWAInstallPrompt />
          <main id="main-content">
            <Suspense fallback={<PageSkeleton />}>
              <PageTransitionWrapper>
                {children}
              </PageTransitionWrapper>
            </Suspense>
          </main>
        </Providers>
      </body>
    </html>
  )
}
