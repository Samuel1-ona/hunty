import Image, { ImageProps } from 'next/image';
import React from 'react';
import { logger } from '@/lib/logger';
import { resolveIpfsForCdn, buildWeservUrl } from '@/lib/cdn';

/**
 * CDN-aware image loader for IPFS and regular assets.
 * Routes images through images.weserv.nl for on-the-fly resizing,
 * automatic WebP conversion, and CDN-level caching (geographic distribution).
 */
export const ipfsImageLoader = ({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) => {
  const resolvedSrc = resolveIpfsForCdn(src);
  return buildWeservUrl(resolvedSrc, width, quality ?? 75);
};

/**
 * IpfsImage – Next.js Image wrapper with CDN-aware resizing loader.
 * Handles ipfs://, bare CIDs, and regular URLs transparently.
 */
export const IpfsImage: React.FC<ImageProps> = (props) => {
  const { src, width, height, quality, alt = '', ...rest } = props;

  if (!src) {
    logger.warn('IpfsImage: src prop is missing');
    return null;
  }

  const effectiveWidth = typeof width === 'number' ? width : 800;
  const effectiveHeight = typeof height === 'number' ? height : effectiveWidth;

  return (
    <Image
      {...rest}
      alt={alt}
      src={src as string}
      width={effectiveWidth}
      height={effectiveHeight}
      quality={quality ?? 75}
      loader={ipfsImageLoader}
      unoptimized={false}
    />
  );
};
