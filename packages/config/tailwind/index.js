/**
 * Shared Tailwind configuration preset for the Hunty monorepo.
 *
 * Tailwind v4 is CSS-first — the main config is in app/globals.css.
 * This file provides a base config object for apps that still need
 * a tailwind.config.js (e.g. the mobile app using nativewind with Tailwind v3).
 *
 * @type {import('tailwindcss').Config}
 */
const sharedConfig = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Hunty brand palette — keep in sync with CSS custom properties in globals.css
        hunty: {
          purple: '#7c3aed',
          violet: '#8b5cf6',
          indigo: '#6366f1',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
      },
    },
  },
};

module.exports = sharedConfig;
