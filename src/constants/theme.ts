import { C } from '../theme/colors';

/**
 * Legacy names kept so secondary components keep compiling; they now point at
 * the 1.3.0 dawn tokens in src/theme/colors.ts. New code imports C directly.
 * primaryGold now means "interactive" (indigo); real Premium gold is C.gold.
 */
export const COLORS = {
  primaryGold: C.accent,
  warmCoral: C.heart,
  softLavender: C.accentLight,
  deepIndigo: C.text,
  midnight: C.text,
  cream: C.bg0,
  successGreen: C.success,
  textPrimary: C.text,
  textSecondary: C.textSecondary,
  white: C.white,
};

export const FONTS = {
  displayRegular: 'PlayfairDisplay-Regular',
  displayBold: 'PlayfairDisplay-Bold',
  bodyRegular: 'DMSans-Regular',
  bodyMedium: 'DMSans-Medium',
  bodyBold: 'DMSans-Bold',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  caption: 12,
  body: 16,
  subtitle: 18,
  title: 24,
  affirmation: 28,
  hero: 36,
};
