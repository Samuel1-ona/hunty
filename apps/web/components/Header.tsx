"use client";

import {
  Bell,
  Check,
  ChevronDown,
  Compass,
  Copy,
  ExternalLink,
  Gamepad2,
  HelpCircle,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  Settings as SettingsIcon,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { NetworkIndicator } from "./NetworkIndicator";

import { NotificationPanel } from "@/components/NotificationPanel";
import { Button } from "@hunty/ui";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useWallet } from "@/lib/context/WalletContext";
import { OPEN_WALLET_EVENT } from "@/lib/firstHuntGuide";
import { getUnreadNotificationCount } from "@/lib/notifications/rankTracker";
import {
  createWeeklyDigestNotification,
  shouldSendWeeklyDigest,
} from "@/lib/notifications/weeklyDigest";
import { cn } from "@/lib/utils";
import { getStellarAccountExplorerUrl } from "@/lib/walletAddress";

import { GasSponsorshipIndicator } from "./GasSponsorshipIndicator";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";
import { WalletAddress } from "./WalletAddress";
import { WalletBalance } from "./WalletBalance";
import { WalletIdenticon } from "./WalletIdenticon";
import { WalletSelectionModal } from "./WalletSelectionModal";

// ─── Nav structure ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: "Explore",
    icon: Compass,
    href: "/",
    mega: [
      { label: "Game Arcade", href: "/", desc: "Browse all active hunts" },
      { label: "Featured Hunts", href: "/#featured", desc: "Editor picks this week" },
      { label: "Leaderboard", href: "/?tab=leaderboard", desc: "Top players globally" },
    ],
  },
  {
    label: "Create",
    icon: PlusCircle,
    href: "/hunty",
    mega: [
      { label: "New Hunt", href: "/hunty", desc: "Design your own challenge" },
      { label: "Templates", href: "/hunty/templates", desc: "Start from a template" },
    ],
  },
  {
    label: "Dashboard",
    icon: Gamepad2,
    href: "/dashboard",
    mega: [
      { label: "My Hunts", href: "/dashboard", desc: "Hunts you manage" },
      { label: "Stats", href: "/dashboard", desc: "Your performance metrics" },
    ],
  },
  {
    label: "Profile",
    icon: User,
    href: "/profile",
    mega: null,
  },
  {
    label: "Settings",
    icon: SettingsIcon,
    href: "/settings",
    mega: null,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SearchBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 top-full mt-2 z-50 px-4 md:px-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            aria-label={a11y("searchInput")}
            placeholder="Search hunts, creators, rewards…"
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-base"
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <button
            onClick={onClose}
            aria-label={a11y("closeSearch")}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="border-t border-slate-100 dark:border-white/5 px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
            Quick links
          </p>
          <div className="flex flex-wrap gap-2">
            {["Active hunts", "XLM rewards", "NFT prizes", "Trending"].map((tag) => (
              <Link
                key={tag}
                href={`/?search=${encodeURIComponent(tag)}`}
                onClick={onClose}
                className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#3737A4]/10 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MegaMenu({ items }: { items: { label: string; href: string; desc: string }[] }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-64 z-50 bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl hover:bg-[#3737A4]/5 dark:hover:bg-indigo-900/20 group transition-colors"
        >
          <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#3737A4] dark:group-hover:text-indigo-400 transition-colors">
            {item.label}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</span>
        </Link>
      ))}
    </div>
  );
}

function MobileMenu({
  open,
  onClose,
  connected,
  displayKey,
  publicKey,
  onConnectWallet,
  onDisconnect,
}: {
  open: boolean;
  onClose: () => void;
  connected: boolean;
  displayKey: string;
  publicKey: string;
  onConnectWallet: () => void;
  onDisconnect: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950 overflow-y-auto">
      {/* Header row */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
        <span className="text-2xl font-black bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent">
          Hunty
        </span>
        <button
          onClick={onClose}
            aria-label={a11y("closeMenu")}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <X className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 px-4 py-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-800 dark:text-slate-200 hover:bg-[#3737A4]/5 dark:hover:bg-indigo-900/20 hover:text-[#3737A4] dark:hover:text-indigo-400 font-semibold transition-colors"
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="h-px bg-slate-100 dark:bg-white/5 mx-4" />

      {/* Wallet section */}
      <div className="px-4 py-4">
        {connected ? (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-[#0C0C4F] to-[#4A4AFF]">
              <p className="text-xs text-blue-200 font-medium mb-0.5">Connected</p>
              {publicKey ? (
                <WalletAddress
                  address={publicKey}
                  identiconSize={20}
                  className="text-white [&_button]:text-blue-200 [&_a]:text-blue-200"
                  addressClassName="text-white"
                />
              ) : (
                <p className="text-white font-mono text-sm truncate">{displayKey}</p>
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900">
              <WalletBalance variant="row" />
              <button
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
            <div className="px-4 pb-3 bg-slate-50 dark:bg-slate-900">
              <GasSponsorshipIndicator />
            </div>
          </div>
        ) : (
          <Button
            onClick={() => {
              onConnectWallet();
              onClose();
            }}
            className="w-full bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] hover:opacity-90 text-white font-bold py-3 rounded-2xl text-base"
          >
            Connect Wallet
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Header ───────────────────────────────────────────────────────────────

export function Header() {
  const t = useTranslations("header");
  const a11y = useTranslations("a11y");
  const mounted = useIsMounted();
  const { connected, displayKey, publicKey, connect, disconnect, walletProvider } = useWallet();

  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadNotificationCount());

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const megaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sticky + shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Poll unread notification count
  useEffect(() => {
    const interval = setInterval(() => {
      setUnreadCount(getUnreadNotificationCount());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Weekly digest check on mount
  useEffect(() => {
    if (shouldSendWeeklyDigest()) {
      createWeeklyDigestNotification();
    }
  }, []);

  useEffect(() => {
    const openWallet = () => setModalOpen(true);
    window.addEventListener(OPEN_WALLET_EVENT, openWallet);
    return () => window.removeEventListener(OPEN_WALLET_EVENT, openWallet);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCopy = async () => {
    if (!publicKey) return;

    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      toast.success("Wallet address copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused on insecure origins and in some in-app
      // browsers, so surface it instead of leaving the click looking ignored.
      toast.error("Couldn't copy the address. Select and copy it manually.");
    }
  };

  const handleDisconnect = () => {
    setDropdownOpen(false);
    disconnect();
  };

  const openMega = useCallback((label: string) => {
    if (megaTimeoutRef.current) clearTimeout(megaTimeoutRef.current);
    setActiveMega(label);
  }, []);

  const closeMega = useCallback(() => {
    megaTimeoutRef.current = setTimeout(() => setActiveMega(null), 120);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-200",
          scrolled
            ? "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-sm border-b border-slate-200/60 dark:border-white/5"
            : "bg-transparent"
        )}
      >
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4 h-16 md:h-18">
          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0 text-2xl md:text-3xl font-black bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent mr-2"
              aria-label={a11y("homeLink")}
          >
            Hunty
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1" aria-label={a11y("mainNav")}>
            {NAV_ITEMS.map(({ label, href, mega, icon: Icon }) => (
              <div
                key={label}
                className="relative"
                onMouseEnter={() => mega && openMega(label)}
                onMouseLeave={() => mega && closeMega()}
              >
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors",
                    "text-slate-600 dark:text-slate-300 hover:text-[#3737A4] dark:hover:text-indigo-400 hover:bg-[#3737A4]/5 dark:hover:bg-indigo-900/20"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {mega && (
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-150",
                        activeMega === label && "rotate-180"
                      )}
                    />
                  )}
                </Link>
                {mega && activeMega === label && (
                  <div onMouseEnter={() => openMega(label)} onMouseLeave={() => closeMega()}>
                    <MegaMenu items={mega} />
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Network Indicator */}
            <NetworkIndicator variant="pill" showIcon={true} />

            {/* Search */}
            <button
              onClick={() => {
                setSearchOpen((v) => !v);
                setNotifOpen(false);
              }}
              aria-label={a11y("search")}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setSearchOpen(false);
                }}
                aria-label={
                  unreadCount > 0
                    ? `${a11y("notifications")}, ${a11y("unreadCount", { count: unreadCount })}`
                    : a11y("notifications")
                }
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E87785] ring-2 ring-white dark:ring-slate-950"
                    aria-hidden="true"
                  />
                )}
              </button>
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            <LanguageSelector />
            <ThemeToggle />

            {/* Wallet */}
            {mounted && connected ? (
              <div className="hidden sm:flex items-center gap-2">
                {/* Live XLM balance + NFT count */}
                <WalletBalance id="balance-pill" className="hidden lg:flex" />

                {/* Wallet button */}
                <div className="relative" ref={dropdownRef}>
                  <Button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="border-2 border-transparent flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 hover:opacity-80 rounded-xl"
                    style={{
                      background:
                        "linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(to right, #0C0C4F, #4A4AFF) border-box",
                    }}
                  >
                    {publicKey ? (
                      <WalletIdenticon address={publicKey} size={20} className="flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] flex-shrink-0" />
                    )}
                    <span className="font-bold text-sm bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text truncate max-w-[100px] lg:max-w-[140px]">
                      {displayKey}
                    </span>
                    <ChevronDown
                      data-testid="wallet-chevron"
                      className={cn(
                        "w-3.5 h-3.5 text-[#3737A4] transition-transform duration-150",
                        dropdownOpen && "rotate-180"
                      )}
                    />
                  </Button>

                  {/* Wallet dropdown */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-[#0C0C4F] to-[#4A4AFF] flex items-start gap-3">
                        {publicKey && (
                          <WalletIdenticon
                            address={publicKey}
                            size={36}
                            className="flex-shrink-0 mt-0.5 ring-2 ring-white/25"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-blue-200 font-medium mb-0.5">
                            {t("connectedWallet")}
                          </p>
                          <p className="text-[11px] uppercase tracking-wide text-blue-200/80 mb-1">
                            {walletProvider ?? "freighter"}
                          </p>
                          <p className="text-white font-mono text-xs break-all">{publicKey}</p>
                        </div>
                      </div>
                      <div className="px-4 pt-3">
                        <GasSponsorshipIndicator />
                      </div>
                      <div className="p-2 flex flex-col gap-1">
                        <button
                          onClick={handleCopy}
                          aria-label={a11y("copyWalletAddress")}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          {copied ? t("copied") : t("copyAddress")}
                        </button>

                        {publicKey && (
                          <a
                            href={getStellarAccountExplorerUrl(publicKey)}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={a11y("viewOnExplorer")}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                          >
                            <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>View on explorer</span>
                          </a>
                        )}

                        <button
                          onClick={() => {
                            const type = window.location.pathname.includes("/creator")
                              ? "creator"
                              : "player";
                            window.dispatchEvent(
                              new CustomEvent("start-onboarding-tour", {
                                detail: { tourType: type },
                              })
                            );
                            setDropdownOpen(false);
                          }}
                          aria-label={a11y("takeTour")}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>Take Tour</span>
                        </button>

                        <Link
                          href="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <SettingsIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>Settings</span>
                        </Link>

                        <div className="h-px bg-slate-100 dark:bg-white/5 mx-3" />
                        <button
                          onClick={handleDisconnect}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left font-medium"
                        >
                          <LogOut className="w-4 h-4 flex-shrink-0" />
                          {t("disconnectWallet")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Button
                id="wallet-button"
                onClick={() => setModalOpen(true)}
                className="hidden sm:inline-flex bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] hover:opacity-90 text-white font-bold px-4 py-2 rounded-xl text-sm"
              >
                {t("connectWallet")}
              </Button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label={a11y("openMenu")}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Search bar (drops below header) */}
          <SearchBar open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
      </header>

      {/* Mobile menu */}
      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        connected={connected}
        displayKey={displayKey}
        publicKey={publicKey}
        onConnectWallet={() => setModalOpen(true)}
        onDisconnect={disconnect}
      />

      {/* Wallet selection modal */}
      <WalletSelectionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnect={(provider) => connect(provider)}
      />
    </>
  );
}
