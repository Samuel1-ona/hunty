"use client";

import * as React from 'react';
import Lottie from 'lottie-react';
import Image from 'next/image';
import { useXlmUsdPrice } from "@/hooks/useXlmUsdPrice";

type NFT = {
  id: string;
  name: string;
  thumbnailUrl: string;
};

interface HuntCompletedProps {
  xlmEarned: number;
  nftsEarned: NFT[];
  onClaim: () => void;
}

const FIREWORK_URL_1 = "https://assets10.lottiefiles.com/packages/lf20_jhu1lmks.json";
const FIREWORK_URL_2 = "https://assets2.lottiefiles.com/packages/lf20_xlky4kvh.json";

// Tiny dark blur placeholder (8x8 px SVG, base64) used while NFT thumbnails load.
const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxYTFhMmUiLz48L3N2Zz4=";

export default function HuntCompleted({ xlmEarned, nftsEarned, onClaim }: HuntCompletedProps) {
  const { price: xlmUsdPrice } = useXlmUsdPrice();

  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  const usdEquivalent =
    xlmUsdPrice != null ? currencyFormatter.format(xlmEarned * xlmUsdPrice) : null;
  const [animatedXlm, setAnimatedXlm] = React.useState(0);
  const [lottie1Loaded, setLottie1Loaded] = React.useState(false);
  const [lottie2Loaded, setLottie2Loaded] = React.useState(false);
  const [lottie3Loaded, setLottie3Loaded] = React.useState(false);
  const [animationData1, setAnimationData1] = React.useState<object | null>(null);
  const [animationData2, setAnimationData2] = React.useState<object | null>(null);
  const [animationData3, setAnimationData3] = React.useState<object | null>(null);
  const [showXlm, setShowXlm] = React.useState(false);
  const [showNfts, setShowNfts] = React.useState(false);
  const styleRef = React.useRef<HTMLStyleElement | null>(null);

  React.useEffect(() => {
    fetch(FIREWORK_URL_1)
      .then(res => res.json())
      .then(data => { setAnimationData1(data); setLottie1Loaded(true); });
    fetch(FIREWORK_URL_2)
      .then(res => res.json())
      .then(data => { setAnimationData2(data); setLottie2Loaded(true); });
    fetch(FIREWORK_URL_1)
      .then(res => res.json())
      .then(data => { setAnimationData3(data); setLottie3Loaded(true); });
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowXlm(true), 300);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowNfts(true), 600);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (xlmEarned <= 0) { setAnimatedXlm(0); return; }
    const duration = 1500;
    const fps = 60;
    const increment = xlmEarned / (duration / 1000 * fps);
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= xlmEarned) {
        setAnimatedXlm(xlmEarned);
        clearInterval(interval);
      } else {
        setAnimatedXlm(parseFloat(current.toFixed(2)));
      }
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [xlmEarned]);

  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes huntCardIn {
        0%   { transform: translateY(60px); opacity: 0; }
        100% { transform: translateY(0);    opacity: 1; }
      }
      @keyframes glitch {
        0%, 100% { text-shadow: 0 0 0 transparent; }
        10%  { text-shadow: -2px 0 #ff0066, 2px 0 #00ffff; }
        20%  { text-shadow:  2px 0 #ff0066,-2px 0 #00ffff; }
        30%  { text-shadow: -2px 0 #ff0066, 2px 0 #00ffff; }
        40%  { text-shadow:  2px 0 #ff0066,-2px 0 #00ffff; }
        50%  { text-shadow: -2px 0 #ff0066, 2px 0 #00ffff; }
        60%  { text-shadow:  2px 0 #ff0066,-2px 0 #00ffff; }
        70%  { text-shadow: -2px 0 #ff0066, 2px 0 #00ffff; }
        80%  { text-shadow:  2px 0 #ff0066,-2px 0 #00ffff; }
        90%  { text-shadow: -2px 0 #ff0066, 2px 0 #00ffff; }
      }
      @keyframes shimmer {
        0%   { background-position: 0%   50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0%   50%; }
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;
    return () => {
      if (styleRef.current?.parentNode) {
        styleRef.current.parentNode.removeChild(styleRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden" style={{ margin: 0, padding: 0 }}>
      <div
        className="absolute inset-0 z-0"
        style={{ width: '100vw', height: '100vh', background: 'radial-gradient(circle at center, #0d0d1a, #000)' }}
      />

      {lottie1Loaded && animationData1 && (
        <div className="absolute z-0" style={{ width: '100vw', height: '100vh', top: 0, left: 0, animationDelay: '0ms' }}>
          <Lottie animationData={animationData1} loop autoplay style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {lottie2Loaded && animationData2 && (
        <div className="absolute z-0" style={{ width: '100vw', height: '100vh', top: 0, right: 0, animationDelay: '600ms' }}>
          <Lottie animationData={animationData2} loop autoplay style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {lottie3Loaded && animationData3 && (
        <div className="absolute z-0 flex items-center justify-center" style={{ width: '100vw', height: '100vh', top: 0, left: 0, animationDelay: '300ms' }}>
          <Lottie animationData={animationData3} loop autoplay style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      <div className="absolute z-10 flex items-center justify-center w-screen h-screen" style={{ margin: 0, padding: 0 }}>
        <div
          className="relative flex flex-col items-center"
          style={{
            maxWidth: '420px',
            padding: '40px',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            animation: 'huntCardIn 500ms ease-out forwards',
          }}
        >
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '40px', animation: 'glitch 3s ease-in-out 3 forwards', color: '#fff' }}>
            HUNT COMPLETED
          </h1>

          <div style={{ width: '100%', opacity: showXlm ? 1 : 0, transform: showXlm ? 'translateY(0)' : 'translateY(20px)', transition: 'all 500ms ease-out' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a0a0b0', marginBottom: '8px' }}>
                XLM EARNED
              </div>
              <div style={{ fontSize: '52px', fontWeight: 'bold', color: '#FFD700', textShadow: '0 0 30px rgba(255,215,0,0.6)' }}>
                ✦ {animatedXlm.toFixed(1)}
              </div>
              {usdEquivalent && (
                <div style={{ fontSize: '16px', color: '#a0a0b0', marginTop: '4px' }}>
                  ≈ {usdEquivalent}
                </div>
              )}
            </div>
          </div>

          <div style={{ width: '100%', opacity: showNfts ? 1 : 0, transform: showNfts ? 'translateY(0)' : 'translateY(20px)', transition: 'all 500ms ease-out' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a0a0b0', marginBottom: '8px' }}>
                NFTs UNLOCKED
              </div>
              {nftsEarned.length === 0 ? (
                <div style={{ color: '#666', fontSize: '14px' }}>No NFTs this hunt</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {nftsEarned.map((nft) => (
                    <div
                      key={nft.id}
                      className="flex items-center gap-3 px-4 py-2"
                      style={{ position: 'relative', borderRadius: '9999px', background: 'rgba(0,0,0,0.3)' }}
                    >
                      {/*
                       * NFT thumbnails are user-supplied URLs from arbitrary external sources.
                       * unoptimized avoids next/image domain whitelist issues while still giving
                       * us lazy loading and a blur placeholder during fetch.
                       */}
                      <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
                        <Image
                          src={nft.thumbnailUrl}
                          alt={nft.name}
                          fill
                          sizes="40px"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL={BLUR_PLACEHOLDER}
                          unoptimized
                          className="rounded-lg object-cover"
                        />
                      </div>
                      <span style={{ color: '#fff', fontSize: '14px' }}>{nft.name}</span>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '9999px',
                          padding: '2px',
                          background: 'linear-gradient(90deg, rgba(255,215,0,0.8), rgba(255,140,0,0.8), rgba(255,215,0,0.8))',
                          backgroundSize: '200% 200%',
                          animation: 'shimmer 3s linear infinite',
                          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          maskComposite: 'xor',
                          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          WebkitMaskComposite: 'xor',
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClaim}
            className="rounded-full font-bold transition-all duration-300"
            style={{ padding: '16px 32px', background: 'linear-gradient(135deg, #FFD700, #FF8C00)', color: '#000', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', border: 'none', outline: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(255,215,0,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            CLAIM REWARDS
          </button>
        </div>
      </div>
    </div>
  );
}