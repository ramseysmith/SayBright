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

export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const a = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
