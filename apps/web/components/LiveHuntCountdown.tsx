'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCountdownParts,
  getTimeWarningLevel,
  resolveHuntLiveStatus,
  type HuntLiveStatus,
  type TimeWarningLevel,
} from '@/lib/huntCountdown';
import { syncServerTime, getServerSyncedNowSeconds } from '@/lib/serverTime';
import { cn } from '@/lib/utils';

interface LiveHuntCountdownProps {
  startTime?: number;
  endTime?: number;
  /** Called once when the end timer expires (auto-submit / force end). */
  onExpire?: () => void;
  /** Called when warning level changes. */
  onWarningChange?: (level: TimeWarningLevel) => void;
  className?: string;
  /** Show start countdown when hunt is scheduled. */
  showStartCountdown?: boolean;
}

const WARNING_STYLES: Record<TimeWarningLevel, string> = {
  none: 'text-slate-100 border-white/10 bg-white/5',
  caution: 'text-amber-200 border-amber-500/30 bg-amber-500/10',
  warning: 'text-orange-200 border-orange-500/40 bg-orange-500/10',
  critical: 'text-red-200 border-red-500/50 bg-red-500/15 animate-pulse',
  expired: 'text-red-300 border-red-500/40 bg-red-500/10',
};

const STATUS_LABEL: Record<HuntLiveStatus, string> = {
  scheduled: 'Starts in',
  live: 'Time remaining',
  ending_soon: 'Ending soon',
  ended: 'Hunt ended',
  unknown: 'Timer',
};

export function LiveHuntCountdown({
  startTime,
  endTime,
  onExpire,
  onWarningChange,
  className,
  showStartCountdown = true,
}: LiveHuntCountdownProps) {
  const [now, setNow] = useState(() => getServerSyncedNowSeconds());
  const [synced, setSynced] = useState(false);
  const expiredRef = useRef(false);
  const lastWarningRef = useRef<TimeWarningLevel>('none');

  useEffect(() => {
    let cancelled = false;
    syncServerTime().then(() => {
      if (!cancelled) {
        setSynced(true);
        setNow(getServerSyncedNowSeconds());
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tick = useCallback(() => {
    setNow(getServerSyncedNowSeconds());
  }, []);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const status = resolveHuntLiveStatus({ startTime, endTime, now });
  const target =
    status === 'scheduled' && showStartCountdown && startTime != null ? startTime : endTime;

  const parts = target != null ? getCountdownParts(target, now) : null;
  const warning =
    status === 'scheduled' || !parts ? 'none' : getTimeWarningLevel(parts.totalSeconds);

  useEffect(() => {
    if (warning !== lastWarningRef.current) {
      lastWarningRef.current = warning;
      onWarningChange?.(warning);
    }
  }, [warning, onWarningChange]);

  useEffect(() => {
    if (
      !expiredRef.current &&
      endTime != null &&
      now >= endTime &&
      (status === 'ended' || parts?.expired)
    ) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [now, endTime, status, parts?.expired, onExpire]);

  if (target == null) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition-colors',
        WARNING_STYLES[status === 'ended' ? 'expired' : warning],
        className
      )}
      role="timer"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] uppercase tracking-widest opacity-80">{STATUS_LABEL[status]}</p>
        <span className="text-[10px] opacity-60">{synced ? 'server-synced' : 'syncing…'}</span>
      </div>

      {status === 'ended' || parts?.expired ? (
        <p className="font-semibold text-sm">Time&apos;s up</p>
      ) : parts ? (
        <div className="flex gap-2 sm:gap-3">
          {parts.days > 0 && <TimeUnit value={parts.days} label="days" />}
          <TimeUnit value={parts.hours} label="hrs" />
          <TimeUnit value={parts.minutes} label="min" />
          <TimeUnit value={parts.seconds} label="sec" />
        </div>
      ) : null}

      {warning === 'critical' && status !== 'ended' && (
        <p className="mt-2 text-xs font-medium">
          Less than a minute left — answers will auto-submit.
        </p>
      )}
      {warning === 'warning' && <p className="mt-2 text-xs">Hurry — under 5 minutes remaining.</p>}
      {warning === 'caution' && (
        <p className="mt-2 text-xs opacity-80">30 minutes or less remaining.</p>
      )}
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[2.75rem]">
      <span className="font-mono text-xl font-semibold tabular-nums">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}
