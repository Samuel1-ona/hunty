"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Coin from "./icons/Coin";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useWallet } from "@/lib/context/WalletContext";
import { WalletBottomSheet } from "./WalletBottomSheet";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSelector } from "./LanguageSelector";

export function Header({ balance = "0" }: { balance?: string }) {
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

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const megaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sticky + shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <>
      <header className="flex flex-row flex-wrap sm:flex-nowrap justify-between items-center py-4 sm:py-6 lg:py-8 px-4 max-w-[1600px] mx-auto pb-8 sm:pb-12 lg:pb-24 gap-4">
        {/* Logo */}
        <div className="font-normal text-xl sm:text-2xl md:text-3xl lg:text-4xl bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent flex-shrink-0">
          Hunty
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          <ThemeToggle />
        </div>

        {mounted && connected ? (
          <div className="flex flex-row items-center gap-2 sm:gap-4 min-w-0 w-full sm:w-auto flex-1 justify-between sm:justify-end">
            {/* Balance pill */}
            <div id="balance-pill" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full">
              <Coin />
              <span className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent text-xs sm:text-sm md:text-base lg:text-xl font-medium">
                {balance}
              </span>
            </div>

            {/* Wallet button + dropdown */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <Button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="border-2 border-transparent hover:opacity-80 flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm md:text-base lg:text-xl justify-center bg-white dark:bg-slate-900"
                style={{
                  background:
                    "linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(to right, #0C0C4F, #4A4AFF) border-box",
                }}
              >
                <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 rounded-full bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] flex-shrink-0" />
                <span className="font-black bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text truncate max-w-[70px] sm:max-w-[120px] md:max-w-[150px] lg:max-w-[200px]">
                  {displayKey}
                </span>
                {/* Chevron indicator */}
                <svg
                  className={cn(
                    "w-3 h-3 ml-1 text-[#3737A4] transition-transform duration-200",
                    dropdownOpen && "rotate-180"
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-xl z-50 overflow-hidden backdrop-blur-xl">
                  {/* Header strip */}
                  <div className="px-4 py-3 bg-gradient-to-r from-[#0C0C4F] to-[#4A4AFF]">
                    <p className="text-xs text-blue-200 font-medium mb-1">
                      Connected wallet
                    </p>
                    <p className="text-[11px] uppercase tracking-wide text-blue-200/90 mb-1">
                      {walletProvider ?? "freighter"}
                    </p>
                    <p className="text-white font-mono text-xs break-all leading-relaxed">
                      {publicKey}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="p-2 flex flex-col gap-1">
                    <button
                      onClick={handleCopy}
                      aria-label="Copy wallet address"
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      )}
                      <span>{copied ? "Copied!" : "Copy address"}</span>
                    </button>

                    <div className="h-px bg-slate-100 dark:bg-white/5 mx-3" />

                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left font-medium"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span>Disconnect wallet</span>
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
            className="bg-[#0C0C4F] hover:bg-slate-700 text-white px-4 md:px-6 py-2 sm:py-3 rounded-xl text-sm md:text-xl font-black"
          >
            Connect Wallet
          </Button>
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
              onClick={() => { setSearchOpen((v) => !v); setNotifOpen(false); }}
              aria-label="Search"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen((v) => !v); setSearchOpen(false); }}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E87785] ring-2 ring-white dark:ring-slate-950" aria-hidden="true" />
                )}
              </button>
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            <ThemeToggle />

            {/* Wallet */}
            {mounted && connected ? (
              <div className="hidden sm:flex items-center gap-2">
                {/* Balance */}
                <div
                  id="balance-pill"
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <Coin />
                  <span className="text-sm font-semibold bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
                    {balance}
                  </span>
                </div>

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
                    <div className="w-5 h-5 rounded-full bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] flex-shrink-0" />
                    <span className="font-bold text-sm bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text truncate max-w-[100px] lg:max-w-[140px]">
                      {displayKey}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-[#3737A4] transition-transform duration-150",
                        dropdownOpen && "rotate-180"
                      )}
                    />
                  </Button>

                  {/* Wallet dropdown */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-[#0C0C4F] to-[#4A4AFF]">
                        <p className="text-xs text-blue-200 font-medium mb-0.5">Connected wallet</p>
                        <p className="text-[11px] uppercase tracking-wide text-blue-200/80 mb-1">
                          {walletProvider ?? "freighter"}
                        </p>
                        <p className="text-white font-mono text-xs break-all">{publicKey}</p>
                      </div>
                      <div className="p-2 flex flex-col gap-1">
                        <button
                          onClick={handleCopy}
                          aria-label="Copy wallet address"
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          {copied ? "Copied!" : "Copy address"}
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-white/5 mx-3" />
                        <button
                          onClick={handleDisconnect}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left font-medium"
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
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
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
        onConnectWallet={() => setModalOpen(true)}
        onDisconnect={disconnect}
        balance={balance}
      />

      {/* Wallet bottom sheet */}
      <WalletBottomSheet
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnect={(provider) => connect(provider)}
      />
    </>
  );
}