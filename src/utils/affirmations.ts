import {
  Affirmation,
  AFFIRMATIONS,
  CATEGORIES,
  Category,
} from '../data/affirmations';

export function getAffirmationsByCategories(
  categoryIds: string[]
): Affirmation[] {
  if (categoryIds.length === 0) return AFFIRMATIONS;
  return AFFIRMATIONS.filter((a) => categoryIds.includes(a.categoryId));
}

export function getAffirmationsByCategory(categoryId: string): Affirmation[] {
  return AFFIRMATIONS.filter((a) => a.categoryId === categoryId);
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export interface DisplayInfo {
  icon: string;
  name: string;
  color: string;
}

export function getDisplayInfo(id: string): DisplayInfo | undefined {
  const cat = CATEGORIES.find((c) => c.id === id);
  if (cat) return { icon: cat.icon, name: cat.name, color: cat.color };
  return undefined;
}

export function getAffirmationById(id: string): Affirmation | undefined {
  return AFFIRMATIONS.find((a) => a.id === id);
}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getTodayKey(): string {
  return getDateKey(new Date());
}

// FNV-1a. Turns a date plus the user's categories into a stable seed so the
// notification and the Today tab resolve to the same affirmation.
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const rand = seededRandom(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Same inputs always yield the same affirmations, so this can be called from
// the Today tab and from notification scheduling without them disagreeing.
export function getDailyAffirmations(
  dateKey: string,
  categoryIds: string[],
  count: number
): Affirmation[] {
  const scoped = getAffirmationsByCategories(categoryIds);
  const pool = scoped.length > 0 ? scoped : AFFIRMATIONS;
  const seed = hashString(`${dateKey}|${[...categoryIds].sort().join(',')}`);
  return seededShuffle(pool, seed).slice(0, count);
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const a = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
