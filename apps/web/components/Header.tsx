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
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { NotificationPanel } from "@/components/NotificationPanel";
import { Button } from "@/components/ui/button";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useWallet } from "@/lib/context/WalletContext";
import { getUnreadNotificationCount } from "@/lib/notifications/rankTracker";
import {
  createWeeklyDigestNotification,
  shouldSendWeeklyDigest,
} from "@/lib/notifications/weeklyDigest";
import { cn } from "@/lib/utils";
import { getStellarAccountExplorerUrl } from "@/lib/walletAddress";

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
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SearchBar({
  open,
  onClose,
  previousFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  previousFocusRef: React.RefObject<HTMLElement | null>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Shared focus trap handles Tab cycling. We pass previousFocusRef-driven
  // restoration (not the trap's default) because we want to focus the input
  // first, not the trap's auto-selected first element (the close button).
  const containerRef = useFocusTrap<HTMLDivElement>(open, {
    autoFocus: false,
  });

  // Move focus into the search input on open so SR users land on the field.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Restore focus to the trigger button after the overlay closes.
  useEffect(() => {
    if (!open && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open, previousFocusRef]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 top-full mt-2 z-50 px-4 md:px-8"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            aria-label="Search hunts, creators, rewards"
            placeholder="Search hunts, creators, rewards…"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
            }}
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-base"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
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
                className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#3737A4]/10 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
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
    <div
      className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-64 z-50 bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 animate-in fade-in slide-in-from-top-2 duration-150"
      role="menu"
    >
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          role="menuitem"
          className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl hover:bg-[#3737A4]/5 dark:hover:bg-indigo-900/20 group transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
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
  const menuRef = useFocusTrap<HTMLDivElement>(open);

  // Escape closes the mobile menu (handled here because focus trap alone only
  // intercepts Tab). Radix Dialog handles its own Escape, but MobileMenu is a
  // bare <div> overlay and needs the listener.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
        <span className="text-2xl font-black bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent">
          Hunty
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
        >
          <X className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile primary">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-800 dark:text-slate-200 hover:bg-[#3737A4]/5 dark:hover:bg-indigo-900/20 hover:text-[#3737A4] dark:hover:text-indigo-400 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
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
                type="button"
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
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

  // Refs of the trigger buttons so we can restore focus when overlay closes.
  const walletButtonRef = useRef<HTMLButtonElement | null>(null);
  const notifButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchPreviousFocusRef = useRef<HTMLElement | null>(null);

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

  // Escape closes any open overlay; focus is restored by the open → !open
  // transitions in the per-overlay effects below.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (searchOpen) {
        event.preventDefault();
        setSearchOpen(false);
        return;
      }
      if (notifOpen) {
        event.preventDefault();
        setNotifOpen(false);
        notifButtonRef.current?.focus();
        return;
      }
      if (dropdownOpen) {
        event.preventDefault();
        setDropdownOpen(false);
        walletButtonRef.current?.focus();
        return;
      }
      if (mobileOpen) {
        event.preventDefault();
        setMobileOpen(false);
        hamburgerButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [searchOpen, notifOpen, dropdownOpen, mobileOpen]);

  // When the search overlay closes, restore focus to the trigger.
  useEffect(() => {
    if (!searchOpen && searchPreviousFocusRef.current) {
      searchPreviousFocusRef.current.focus();
      searchPreviousFocusRef.current = null;
    }
  }, [searchOpen]);

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
            aria-label="Hunty home"
          >
            Hunty
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Main navigation">
            {NAV_ITEMS.map(({ label, href, mega, icon: Icon }) => (
              <div
                key={label}
                className="relative"
                onMouseEnter={() => mega && openMega(label)}
                onMouseLeave={() => mega && closeMega()}
                onFocus={() => mega && openMega(label)}
                onBlur={(event) => {
                  // Close on blur only if focus leaves the entire nav-item subtree
                  if (!mega) return;
                  const next = event.relatedTarget as Node | null;
                  if (next && event.currentTarget.contains(next)) return;
                  closeMega();
                }}
              >
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]",
                    "text-slate-600 dark:text-slate-300 hover:text-[#3737A4] dark:hover:text-indigo-400 hover:bg-[#3737A4]/5 dark:hover:bg-indigo-900/20"
                  )}
                  aria-haspopup={mega ? "menu" : undefined}
                  aria-expanded={mega ? activeMega === label : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {mega && (
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-150",
                        activeMega === label && "rotate-180"
                      )}
                    />
                  )}
                </Link>
                {mega && activeMega === label && (
                  <div
                    onMouseEnter={() => openMega(label)}
                    onMouseLeave={() => closeMega()}
                  >
                    <MegaMenu items={mega} />
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Search */}
            <button
              ref={searchButtonRef}
              type="button"
              onClick={() => {
                searchPreviousFocusRef.current = searchButtonRef.current;
                setSearchOpen((v) => !v);
                setNotifOpen(false);
                setDropdownOpen(false);
              }}
              aria-label="Search"
              aria-expanded={searchOpen}
              aria-haspopup="dialog"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                ref={notifButtonRef}
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setSearchOpen(false);
                  setDropdownOpen(false);
                }}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                aria-expanded={notifOpen}
                aria-haspopup="dialog"
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
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
                    ref={walletButtonRef}
                    onClick={() => {
                      setDropdownOpen((v) => !v);
                      setNotifOpen(false);
                      setSearchOpen(false);
                    }}
                    aria-haspopup="menu"
                    aria-expanded={dropdownOpen}
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
                      aria-hidden="true"
                      className={cn(
                        "w-3.5 h-3.5 text-[#3737A4] transition-transform duration-150",
                        dropdownOpen && "rotate-180"
                      )}
                    />
                  </Button>

                  {/* Wallet dropdown */}
                  {dropdownOpen && (
                    <div
                      role="menu"
                      aria-label="Wallet options"
                      className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-xl z-50 overflow-hidden"
                    >
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
                            Connected wallet
                          </p>
                          <p className="text-[11px] uppercase tracking-wide text-blue-200/80 mb-1">
                            {walletProvider ?? "freighter"}
                          </p>
                          <p className="text-white font-mono text-xs break-all">{publicKey}</p>
                        </div>
                      </div>
                      <div className="p-2 flex flex-col gap-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleCopy}
                          aria-label="Copy wallet address"
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          {copied ? "Copied!" : "Copy address"}
                        </button>

                        {publicKey && (
                          <a
                            href={getStellarAccountExplorerUrl(publicKey)}
                            target="_blank"
                            rel="noreferrer noopener"
                            role="menuitem"
                            aria-label="View wallet address on Stellar explorer"
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
                          >
                            <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>View on explorer</span>
                          </a>
                        )}

                        <button
                          type="button"
                          role="menuitem"
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
                          aria-label="Take onboarding tour"
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
                        >
                          <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>Take Tour</span>
                        </button>

                        <div className="h-px bg-slate-100 dark:bg-white/5 mx-3" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleDisconnect}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        >
                          <LogOut className="w-4 h-4 flex-shrink-0" />
                          Disconnect wallet
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
                Connect Wallet
              </Button>
            )}

            {/* Mobile hamburger */}
            <button
              ref={hamburgerButtonRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={mobileOpen}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3737A4]"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Search bar (drops below header) */}
          <SearchBar
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            previousFocusRef={searchPreviousFocusRef}
          />
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
