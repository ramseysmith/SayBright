import { getUserData, setUserData, UserData } from './storage';
import { getTodayKey } from '../utils/affirmations';

export interface StreakResult {
  current: number;
  longest: number;
  isNewDay: boolean;
  milestone: number | null;
}

export const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365];

function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function checkInToday(): Promise<StreakResult> {
  const data = await getUserData();
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  if (data.streak.lastCheckIn === today) {
    return {
      current: data.streak.current,
      longest: data.streak.longest,
      isNewDay: false,
      milestone: null,
    };
  }

  let newCurrent: number;
  if (data.streak.lastCheckIn === yesterday) {
    newCurrent = data.streak.current + 1;
  } else {
    newCurrent = 1;
  }

  const newLongest = Math.max(newCurrent, data.streak.longest);
  const newHistory = data.streak.history.includes(today)
    ? data.streak.history
    : [...data.streak.history, today];

  const milestone = STREAK_MILESTONES.includes(newCurrent) ? newCurrent : null;

  const updated: UserData = {
    ...data,
    streak: {
      current: newCurrent,
      longest: newLongest,
      lastCheckIn: today,
      history: newHistory,
    },
  };

  await setUserData(updated);

  return {
    current: newCurrent,
    longest: newLongest,
    isNewDay: true,
    milestone,
  };
}

export interface MilestoneCopy {
  emoji: string;
  subtitle: string;
}

export const MILESTONE_COPY: Record<number, MilestoneCopy> = {
  7: {
    emoji: '⭐',
    subtitle:
      'One week of positive thinking. You are building something beautiful.',
  },
  14: {
    emoji: '🌟',
    subtitle: 'Two weeks strong. This is becoming a habit.',
  },
  30: {
    emoji: '🏆',
    subtitle: 'A full month. Your mindset is transforming.',
  },
  60: {
    emoji: '💪',
    subtitle: 'Two months of daily affirmations. Incredible commitment.',
  },
  90: {
    emoji: '👑',
    subtitle:
      '90 days. You have proven that consistency is your superpower.',
  },
  180: {
    emoji: '🔥',
    subtitle: 'Half a year of daily brightness. You are unstoppable.',
  },
  365: {
    emoji: '🌈',
    subtitle:
      'One full year. You have changed your life, one affirmation at a time.',
  },
};
