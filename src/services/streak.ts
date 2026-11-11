import { getUserData, setUserData, UserData } from './storage';
import { getTodayKey } from '../utils/affirmations';

export interface StreakResult {
  current: number;
  longest: number;
  isNewDay: boolean;
  milestone: number | null;
  /** Premium used its weekly streak save on this check in */
  saved: boolean;
  /** The streak that reset today after one missed day, for the save offer; null when none */
  lapsed: number | null;
}

export const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365];

function keyDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A streak this long or longer is worth saving */
export const STREAK_SAVE_MIN = 3;
const SAVE_EVERY_DAYS = 7;

function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86400000);
}

function saveAvailable(lastSave: string | null | undefined, today: string): boolean {
  return !lastSave || daysBetween(lastSave, today) >= SAVE_EVERY_DAYS;
}

/**
 * One check in per calendar day. Yesterday continues the streak; anything
 * older restarts it, with one exception (1.4.0, the streak save): after exactly
 * one missed day on a streak of three or more, Premium keeps the streak going,
 * at most once every seven days. A free user's streak restarts, and the lost
 * count is kept for the rest of that day (`lapsed`), so starting Premium the
 * same day brings it back. Called again when Premium changes.
 */
export async function checkInToday(isPremium = false): Promise<StreakResult> {
  const data = await getUserData();
  const today = getTodayKey();
  const { streak } = data;

  if (streak.lastCheckIn === today) {
    // Premium started after today's reset: give the streak back
    if (isPremium && streak.lapsed && streak.lapsed.on === today && saveAvailable(streak.lastSave, today)) {
      const restored = streak.lapsed.count + 1;
      const longest = Math.max(restored, streak.longest);
      await setUserData({ ...data, streak: { ...streak, current: restored, longest, lastSave: today, lapsed: null } });
      return { current: restored, longest, isNewDay: false, milestone: null, saved: true, lapsed: null };
    }
    return {
      current: streak.current,
      longest: streak.longest,
      isNewDay: false,
      milestone: null,
      saved: false,
      lapsed: !isPremium && streak.lapsed && streak.lapsed.on === today ? streak.lapsed.count : null,
    };
  }

  const missedOne = streak.lastCheckIn === keyDaysAgo(2) && streak.current >= STREAK_SAVE_MIN;
  let newCurrent = 1;
  let saved = false;
  let lapsed: { count: number; on: string } | null = null;
  let lastSave = streak.lastSave ?? null;
  if (streak.lastCheckIn === keyDaysAgo(1)) {
    newCurrent = streak.current + 1;
  } else if (missedOne && isPremium && saveAvailable(lastSave, today)) {
    newCurrent = streak.current + 1;
    saved = true;
    lastSave = today;
  } else if (missedOne && saveAvailable(lastSave, today)) {
    lapsed = { count: streak.current, on: today };
  }

  const newLongest = Math.max(newCurrent, streak.longest);
  const newHistory = streak.history.includes(today) ? streak.history : [...streak.history, today];
  const milestone = STREAK_MILESTONES.includes(newCurrent) ? newCurrent : null;

  const updated: UserData = {
    ...data,
    streak: { current: newCurrent, longest: newLongest, lastCheckIn: today, history: newHistory, lastSave, lapsed },
  };
  await setUserData(updated);

  return { current: newCurrent, longest: newLongest, isNewDay: true, milestone, saved, lapsed: lapsed && !isPremium ? lapsed.count : null };
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
