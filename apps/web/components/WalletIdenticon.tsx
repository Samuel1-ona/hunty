'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getIdenticonSpec } from '@/lib/walletAddress';

interface WalletIdenticonProps {
  /** Full Stellar address the avatar is derived from. */
  address: string;
  /** Rendered width and height in pixels. Default 24. */
  size?: number;
  className?: string;
}

/**
 * Deterministic avatar for a wallet address, rendered as inline SVG.
 *
 * Same address always produces the same image, with no network request and no
 * extra dependency, so it is safe to render during SSR and inside long lists
 * such as the leaderboard.
 *
 * Decorative by design: every caller shows the address as text next to it, so
 * the image is hidden from assistive tech rather than duplicating that label.
 */
export function WalletIdenticon({ address, size = 24, className }: WalletIdenticonProps) {
  const {
    cells,
    size: grid,
    foreground,
    background,
  } = useMemo(() => getIdenticonSpec(address), [address]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={cn('rounded-full', className)}
    >
      <rect width={grid} height={grid} fill={background} />
      {cells.map((filled, index) =>
        filled ? (
          <rect
            key={index}
            x={index % grid}
            y={Math.floor(index / grid)}
            width={1}
            height={1}
            fill={foreground}
          />
        ) : null
      )}
    </svg>
  );
}
