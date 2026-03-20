/**
 * RestEasy — Typography System
 * DM Serif Display: headings (warm, editorial)
 * DM Sans: body, UI labels (clean, readable)
 */
import { Platform } from 'react-native';

export const fonts = {
  serifDisplay: 'DMSerifDisplay_400Regular',
  serifDisplayItalic: 'DMSerifDisplay_400Regular_Italic',
  sansLight: 'DMSans_300Light',
  sansRegular: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
} as const;

export const typography = {
  // Display — hero titles
  display: {
    fontFamily: fonts.serifDisplay,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  // H1 — screen titles
  h1: {
    fontFamily: fonts.serifDisplay,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  // H2 — section titles
  h2: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  // H3 — card titles
  h3: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    lineHeight: 22,
  },
  // Body — main text
  body: {
    fontFamily: fonts.sansRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  // Body medium
  bodyMedium: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  // Small — captions, labels
  small: {
    fontFamily: fonts.sansRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  smallMedium: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  // Tab bar labels
  tabLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  // Time display — large numeric
  timeDisplay: {
    fontFamily: fonts.serifDisplay,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 2,
  },
  // Button text
  button: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
} as const;
