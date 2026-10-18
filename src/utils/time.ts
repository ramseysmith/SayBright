import { SKIES, dayPeriod, type DayPeriod } from '../theme/colors';

export type TimeOfDay = DayPeriod;

export interface TimeGradient {
  colors: readonly [string, string, string];
  textColor: string;
  statusBar: 'dark' | 'light';
}

// The skies live in src/theme/colors.ts; this keeps the older shape for the
// share card and anything else that still reads it.
export const TIME_GRADIENTS: Record<TimeOfDay, TimeGradient> = {
  morning: { colors: SKIES.morning.colors, textColor: SKIES.morning.ink, statusBar: SKIES.morning.statusBar },
  afternoon: { colors: SKIES.afternoon.colors, textColor: SKIES.afternoon.ink, statusBar: SKIES.afternoon.statusBar },
  evening: { colors: SKIES.evening.colors, textColor: SKIES.evening.ink, statusBar: SKIES.evening.statusBar },
  night: { colors: SKIES.night.colors, textColor: SKIES.night.ink, statusBar: SKIES.night.statusBar },
};

export function getTimePeriod(date: Date = new Date()): TimeOfDay {
  return dayPeriod(date);
}

export function getTimeOfDay(date: Date = new Date()): {
  period: TimeOfDay;
  gradient: TimeGradient;
} {
  const period = getTimePeriod(date);
  return { period, gradient: TIME_GRADIENTS[period] };
}

export function greetingFor(period: TimeOfDay): string {
  switch (period) {
    case 'morning':
      return 'Good morning';
    case 'afternoon':
      return 'Good afternoon';
    case 'evening':
      return 'Good evening';
    default:
      return 'Good night';
  }
}
