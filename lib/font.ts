import { Hanken_Grotesk, DynaPuff } from 'next/font/google';

/**
 * Primary UI font (Hanken Grotesk).
 *
 * Explicit performance / accessibility configuration:
 * - `display: 'swap'` so text remains visible during the font swap period
 *   (this is next/font's default but is set explicitly here as documentation
 *   and so any future Next.js default change does not silently affect us).
 * - `adjustFontFallback: true` opts into Next.js's auto-generated
 *   size-adjusted local fallback. Next.js computes `size-adjust`,
 *   `ascent-override`, and `descent-override` on the fallback so its metrics
 *   match Hanken Grotesk, eliminating most of the Cumulative Layout Shift
 *   that otherwise occurs when the web font finishes loading and replaces
 *   the fallback.
 * - `preload: true` so the font is fetched as part of the initial document
 *   request, reducing the period during which the fallback is visible.
 */
export const hankenGrotesk = Hanken_Grotesk({
  variable: '--font-hanken-grotesk',
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: true,
  preload: true,
});

/**
 * Decorative display font (DynaPuff). Used sparingly so the CLS impact is
 * smaller than the primary font, but we apply the same explicit config for
 * consistency.
 */
export const dynapuff = DynaPuff({
  variable: '--font-dynapuff',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  adjustFontFallback: true,
});
