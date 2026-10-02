import { describe, expect, it } from 'vitest'
import { colors } from './colors'

function hexToRgb(h: string) {
  return [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
  ]
}

function relativeLuminance(hex: string) {
  const [r, g, b] = hexToRgb(hex)
  const srgb = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function contrastRatio(a: string, b: string) {
  const L1 = relativeLuminance(a)
  const L2 = relativeLuminance(b)
  const light = Math.max(L1, L2)
  const dark = Math.min(L1, L2)
  return (light + 0.05) / (dark + 0.05)
}

describe('color token contrast (WCAG AA)', () => {
  const combos: Array<[keyof typeof colors, keyof typeof colors]> = [
    ['text', 'background'],
    ['textMuted', 'background'],
    ['text', 'surface'],
    ['textMuted', 'surface'],
    ['textDark', 'backgroundDark'],
    ['textMutedDark', 'backgroundDark'],
    ['badgePrimaryText', 'badgePrimary'],
    ['badgeSuccessText', 'badgeSuccess'],
    ['badgeWarningText', 'badgeWarning'],
    ['badgeErrorText', 'badgeError'],
    ['badgeGrayText', 'badgeGray'],
  ]

  for (const [fg, bg] of combos) {
    it(`${fg} on ${bg} has sufficient contrast`, () => {
      const fgHex = colors[fg]
      const bgHex = colors[bg]
      expect(fgHex).toBeDefined()
      expect(bgHex).toBeDefined()
      const ratio = contrastRatio(fgHex, bgHex)
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })
  }
})
