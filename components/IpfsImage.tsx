import Image, { ImageProps } from 'next/image';
import React from 'react';
import { logger } from '@/lib/logger';

/**
 * Custom loader that proxies IPFS or gateway URLs through an image optimization service.
 * It uses https://images.weserv.nl/ which supports resizing and automatic caching.
 *
 * The loader receives the original src, desired width, and optional quality.
 * It returns a URL that points to the optimized proxy.
 */
export const ipfsImageLoader = ({ src, width, quality }: { src: string; width: number; quality?: number }) => {
  // Ensure the source URL is absolute; if it's a raw IPFS URI, convert it.
  let imageUrl = src;
  if (src.startsWith('ipfs://')) {
    // Convert ipfs://<cid>[/path] to a gateway URL
    const cidAndPath = src.slice(7); // strip 'ipfs://'
    imageUrl = `https://gateway.ipfs.io/ipfs/${cidAndPath}`;
  }
  const q = quality ?? 75;
  // Encode the target URL for the proxy service
  const encoded = encodeURIComponent(imageUrl);
  return `https://images.weserv.nl/?url=${encoded}&w=${width}&q=${q}`;
};

/**
 * IpfsImage component – a thin wrapper around Next.js Image that applies the custom loader.
 * All other Image props are passed through.
 */
export const IpfsImage: React.FC<ImageProps> = (props) => {
  const { src, width, height, quality, alt = "", ...rest } = props;
  // Ensure src is provided; Next.js Image requires it.
  if (!src) {
    logger.warn('IpfsImage: src prop is missing');
    return null;
  }
  // width is required for the loader; if not provided, fall back to a default.
  const effectiveWidth = typeof width === 'number' ? width : 800;
  // height is required by Next.js Image to reserve layout space and prevent CLS.
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
