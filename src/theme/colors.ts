/**
 * RestEasy — Color Palette
 * Philosophy: "Nocturnal Calm" — inspired by the night sky
 * Dark mode only. No light mode. Designed for 3am use.
 */
export const colors = {
  // Backgrounds
  deepNavy: '#0B1D3A',      // Primary background — depth of night
  navyMid: '#1E2F54',       // Cards & containers
  navyCard: '#243660',      // Slightly lighter card variant
  navyDark: '#071428',      // Extra dark for Night Mode

  // Brand colors
  softLavender: '#B8A9C9',  // Progress rings, charts, secondary text
  warmPeach: '#F5C7A9',     // CTAs, active sliders, highlights
  mutedSage: '#A8C5B8',     // Positive indicators, success states
  cream: '#F5F0E8',         // Primary text, headings

  // Text
  textPrimary: '#F5F0E8',
  textSecondary: '#B8A9C9',
  textMuted: 'rgba(184, 169, 201, 0.55)',

  // UI
  border: 'rgba(184, 169, 201, 0.15)',
  borderActive: 'rgba(245, 199, 169, 0.4)',
  overlay: 'rgba(11, 29, 58, 0.85)',

  // Status
  success: '#A8C5B8',
  warning: '#F5C7A9',
  error: '#E07B7B',

  // Transparent
  transparent: 'transparent',
  white: '#FFFFFF',
} as const;

export type ColorKey = keyof typeof colors;
