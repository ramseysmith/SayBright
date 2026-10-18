/**
 * SayBright dawn palette (refresh 1.3.0, Oct 2026).
 *
 * The Graysmith Labs formula, from Drift 1.18.0:
 * * One dominant family: dawn, from warm cream to apricot and coral.
 * * One cool accent for everything interactive: indigo, the color of the
 *   horizon line in the app icon.
 * * One warm accent reserved for Premium and the sun in the hero art: gold.
 *   Ordinary controls never use it, so gold always means "more".
 * * Text in three steps of deep indigo ink.
 *
 * Every screen imports C from here. The guard hook flags raw colors in screens.
 */
export const C = {
  // Dawn family, lightest first (page backgrounds and cards)
  bg0: '#FFF8F0',
  bg1: '#FFEFE2',
  bg2: '#FFE0CC',
  bg3: '#FFC9AE',

  // The sky in the icon and the hero: apricot to coral to rose
  dawnTop: '#FFC56E',
  dawnMid: '#FF8F6A',
  dawnLow: '#EE6A8C',
  /** Native splash background; must match design/splash and app.json */
  splash: '#FF9A6B',

  // Surfaces sit on the dawn as warm white glass
  surface: 'rgba(255, 255, 255, 0.72)',
  surfaceStrong: 'rgba(255, 255, 255, 0.92)',
  surfaceOnSky: 'rgba(255, 255, 255, 0.2)',
  surfaceOnSkyStrong: 'rgba(255, 255, 255, 0.32)',
  /** Card glass on the evening and night skies, dark enough for white text */
  surfaceOnDusk: 'rgba(42, 30, 69, 0.42)',
  border: 'rgba(42, 30, 69, 0.08)',
  borderStrong: 'rgba(42, 30, 69, 0.18)',
  borderOnSky: 'rgba(255, 255, 255, 0.45)',

  // Cool accent: interactive
  accent: '#5B4BC4',
  accentLight: '#8E80E6',
  accentDim: 'rgba(91, 75, 196, 0.12)',
  buttonFrom: '#6A5AD6',
  buttonTo: '#4A3BAE',
  onAccent: '#FFFFFF',

  // Warm accent: Premium and the sun only
  gold: '#F5A623',
  goldLight: '#FFC24B',
  goldDeep: '#E8851A',
  goldDim: 'rgba(245, 166, 35, 0.14)',
  goldBorder: 'rgba(245, 166, 35, 0.42)',
  /** Dark ink for text on gold buttons */
  onGold: '#3A2205',

  // Bubble in the icon motif
  bubble: '#FFFCF7',
  bubbleShade: '#FFF0E2',

  // Text: deep indigo ink on dawn, white on the sky
  text: '#2A1E45',
  textSecondary: 'rgba(42, 30, 69, 0.74)',
  textMuted: 'rgba(42, 30, 69, 0.64)',
  textOnSky: '#FFFFFF',
  textOnSkySecondary: 'rgba(255, 255, 255, 0.88)',

  heart: '#E8506E',
  success: '#2E9E6A',
  danger: '#C8414B',
  white: '#FFFFFF',
  scrim: 'rgba(26, 18, 46, 0.55)',
  shadow: '#2A1E45',
  transparent: 'transparent',
} as const;

/**
 * The hero sky follows the time of day, as SayBright always has. Each has three
 * gradient stops, the ink that reads on it, and where the sun sits (0 is on the
 * horizon, 1 is high).
 */
export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export const SKIES: Record<
  DayPeriod,
  { colors: readonly [string, string, string]; ink: string; inkSecondary: string; statusBar: 'dark' | 'light'; sun: number; sunColor: readonly [string, string] }
> = {
  morning: {
    colors: ['#FFC56E', '#FF9F7A', '#FFE3D2'],
    ink: '#2A1E45',
    inkSecondary: 'rgba(42, 30, 69, 0.74)',
    statusBar: 'dark',
    sun: 0.55,
    sunColor: ['#FFE08A', '#F5A623'],
  },
  afternoon: {
    colors: ['#9FD3F2', '#C9B8F0', '#FFE8DA'],
    ink: '#2A1E45',
    inkSecondary: 'rgba(42, 30, 69, 0.74)',
    statusBar: 'dark',
    sun: 0.95,
    sunColor: ['#FFF1B8', '#FFC24B'],
  },
  evening: {
    colors: ['#FF8F6A', '#D96390', '#4B2F8A'],
    ink: '#FFFFFF',
    inkSecondary: 'rgba(255, 255, 255, 0.88)',
    statusBar: 'light',
    sun: 0.2,
    sunColor: ['#FFC56E', '#FF7A59'],
  },
  night: {
    colors: ['#2B1F5C', '#1D1646', '#120D30'],
    ink: '#FFFFFF',
    inkSecondary: 'rgba(255, 255, 255, 0.84)',
    statusBar: 'light',
    sun: 0.75,
    sunColor: ['#FFF6DE', '#E9DDB8'],
  },
};

export function dayPeriod(date: Date = new Date()): DayPeriod {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

/** One small palette per category, so the grid reads at a glance. */
export const CATEGORY_PALETTES: Record<string, { from: string; to: string; ink: string }> = {
  confidence: { from: '#FFE2A8', to: '#FFC77A', ink: '#7A4300' },
  gratitude: { from: '#DDF3DF', to: '#B6E4C0', ink: '#1F6B3E' },
  morning: { from: '#FFE0C2', to: '#FFBE8F', ink: '#8A3B0E' },
  selflove: { from: '#FFDDE6', to: '#FFB8CB', ink: '#9B2348' },
  career: { from: '#DCE8FF', to: '#B5CCFF', ink: '#24479B' },
  relationships: { from: '#EEDFFF', to: '#D6BEFF', ink: '#5A2A9B' },
  health: { from: '#E2F5D8', to: '#C3E8AE', ink: '#3A6B1F' },
  wealth: { from: '#FFF1C2', to: '#FFDE85', ink: '#7A5600' },
  calm: { from: '#E5E2FF', to: '#C9C2F5', ink: '#43378F' },
  creativity: { from: '#FFE0DA', to: '#FFBCAE', ink: '#9B3324' },
};

export const RADIUS = { sm: 12, md: 18, lg: 24, xl: 32 } as const;

/** Content never stretches wider than this, so large screens look designed, not zoomed. */
export const MAX_CONTENT_WIDTH = 560;
