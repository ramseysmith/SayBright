export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface TimeGradient {
  colors: readonly [string, string, string];
  textColor: string;
  statusBar: 'dark' | 'light';
}

export const TIME_GRADIENTS: Record<TimeOfDay, TimeGradient> = {
  morning: {
    colors: ['#F5A623', '#FFB088', '#FFF8F0'],
    textColor: '#1A1A2E',
    statusBar: 'dark',
  },
  afternoon: {
    colors: ['#87CEEB', '#B8A9E8', '#E8E0F5'],
    textColor: '#1A1A2E',
    statusBar: 'dark',
  },
  evening: {
    colors: ['#FF6B6B', '#C85A8A', '#2D1B69'],
    textColor: '#FFFFFF',
    statusBar: 'light',
  },
  night: {
    colors: ['#1A1A2E', '#151530', '#0D0D2B'],
    textColor: '#FFFFFF',
    statusBar: 'light',
  },
};

export function getTimePeriod(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getTimeOfDay(date: Date = new Date()): {
  period: TimeOfDay;
  gradient: TimeGradient;
} {
  const period = getTimePeriod(date);
  return { period, gradient: TIME_GRADIENTS[period] };
}
