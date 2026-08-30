'use client';

import { useEffect, useState } from 'react';
import { getSorobanNetworkType } from '@/lib/soroban/client';
import { AlertTriangle, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkIndicatorProps {
  variant?: 'badge' | 'pill' | 'corner';
  showIcon?: boolean;
  className?: string;
}

/**
 * NetworkIndicator Component
 * Shows the current Stellar network (testnet/mainnet) in the UI
 */
export function NetworkIndicator({
  variant = 'badge',
  showIcon = true,
  className,
}: NetworkIndicatorProps) {
  const [networkType, setNetworkType] = useState<'testnet' | 'mainnet'>('testnet');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNetworkType(getSorobanNetworkType());

    // Listen for network changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'stellar_network_preference') {
        setNetworkType(getSorobanNetworkType());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Don't render on mainnet in production (no need to show)
  const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production';
  if (!mounted || (isProduction && networkType === 'mainnet')) {
    return null;
  }

  const isTestnet = networkType === 'testnet';

  if (variant === 'corner') {
    return (
      <div className={cn('fixed bottom-4 right-4 z-50 pointer-events-none', className)}>
        <div
          className={cn(
            'px-3 py-2 rounded-lg border shadow-lg backdrop-blur-sm',
            isTestnet
              ? 'bg-yellow-50/90 dark:bg-yellow-900/80 border-yellow-300 dark:border-yellow-700'
              : 'bg-green-50/90 dark:bg-green-900/80 border-green-300 dark:border-green-700'
          )}
        >
          <div className="flex items-center gap-2">
            {showIcon &&
              (isTestnet ? (
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
              ))}
            <span
              className={cn(
                'text-sm font-semibold uppercase tracking-wide',
                isTestnet
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : 'text-green-800 dark:text-green-200'
              )}
            >
              {networkType}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
          isTestnet
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
          className
        )}
      >
        {showIcon && (
          <span
            className={cn('w-1.5 h-1.5 rounded-full', isTestnet ? 'bg-yellow-500' : 'bg-green-500')}
          />
        )}
        {networkType.toUpperCase()}
      </div>
    );
  }

  // Default badge variant
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border',
        isTestnet
          ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
          : 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
        className
      )}
    >
      {showIcon && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full', isTestnet ? 'bg-yellow-500' : 'bg-green-500')}
        />
      )}
      {networkType}
    </div>
  );
}

/**
 * TestnetWarning Component
 * Displays a prominent warning when on testnet
 */
export function TestnetWarning() {
  const [networkType, setNetworkType] = useState<'testnet' | 'mainnet'>('testnet');
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNetworkType(getSorobanNetworkType());

    // Check if warning was dismissed in this session
    const isDismissed = sessionStorage.getItem('testnet_warning_dismissed') === 'true';
    setDismissed(isDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('testnet_warning_dismissed', 'true');
  };

  if (!mounted || networkType === 'mainnet' || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                You're on Stellar Testnet
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Transactions use test XLM. No real assets are at risk.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-xs font-medium text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 px-3 py-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-800/30 transition-colors flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
