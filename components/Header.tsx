"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Coin from "./icons/Coin";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useFreighterWallet } from "@/hooks/useFreighterWallet";
import { WalletModal } from "./WalletModal";
import { Copy, LogOut, Check } from "lucide-react";

export function Header({ balance = "0" }: { balance?: string }) {
  const mounted = useIsMounted();
  const { connected, displayKey, publicKey, connect, disconnect } =
    useFreighterWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    setDropdownOpen(false);
    disconnect();
  };

  return (
    <>
      <header className="flex flex-row justify-between items-center py-4 sm:py-6 lg:py-8 px-4 max-w-[1600px] mx-auto pb-8 sm:pb-12 lg:pb-24 gap-4">
        <div className="font-normal text-xl sm:text-2xl md:text-3xl lg:text-4xl bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent flex-shrink-0">
          Hunty
        </div>

        {mounted && connected ? (
          <div className="flex flex-row items-center gap-2 sm:gap-4 min-w-0 flex-1 justify-end">
            {/* Balance pill */}
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full">
              <Coin />
              <span className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent text-xs sm:text-sm md:text-base lg:text-xl font-medium">
                {balance}
              </span>
            </div>

            {/* Wallet button + dropdown */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <Button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="border-2 border-transparent hover:opacity-80 flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm md:text-base lg:text-xl justify-center"
                style={{
                  background:
                    "linear-gradient(white, white) padding-box, linear-gradient(to right, #0C0C4F, #4A4AFF) border-box",
                }}
              >
                <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 rounded-full bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] flex-shrink-0" />
                <span className="font-black bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px] lg:max-w-[200px]">
                  {displayKey}
                </span>
                {/* Chevron indicator */}
                <svg
                  className={`w-3 h-3 ml-1 text-[#3737A4] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
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
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                  {/* Header strip */}
                  <div className="px-4 py-3 bg-gradient-to-r from-[#0C0C4F] to-[#4A4AFF]">
                    <p className="text-xs text-blue-200 font-medium mb-1">
                      Connected wallet
                    </p>
                    <p className="text-white font-mono text-xs break-all leading-relaxed">
                      {publicKey}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="p-2 flex flex-col gap-1">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition-colors text-left"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span>{copied ? "Copied!" : "Copy address"}</span>
                    </button>

                    <div className="h-px bg-slate-100 mx-3" />

                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
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
            onClick={() => setModalOpen(true)}
            className="bg-[#0C0C4F] hover:bg-slate-700 text-white px-4 md:px-6 py-2 sm:py-3 rounded-xl text-sm md:text-xl font-black"
          >
            Connect Wallet
          </Button>
        )}
      </header>

      <WalletModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnect={connect}
      />
    </>
  );
}
