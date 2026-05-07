import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserData {
  favorites: string[];
  streak: {
    current: number;
    longest: number;
    lastCheckIn: string | null;
    history: string[];
  };
  preferences: {
    reminderEnabled: boolean;
    reminderTime: string;
    selectedCategories: string[];
    hasSeenOnboarding: boolean;
  };
  sessionCount: number;
  lastReviewPrompt: string | null;
  dailyUsage: {
    date: string;
    todaySwipeCount: number;
    browseViewCount: number;
    dailyAffirmationIds: string[];
  };
  cachedPremiumStatus: boolean;
  lastPremiumCheck: string | null;
}

const STORAGE_KEY = '@saybright_user_data';

const DEFAULT_USER_DATA: UserData = {
  favorites: [],
  streak: {
    current: 0,
    longest: 0,
    lastCheckIn: null,
    history: [],
  },
  preferences: {
    reminderEnabled: false,
    reminderTime: '08:00',
    selectedCategories: ['confidence', 'gratitude', 'morning', 'selflove'],
    hasSeenOnboarding: false,
  },
  sessionCount: 0,
  lastReviewPrompt: null,
  dailyUsage: {
    date: '',
    todaySwipeCount: 0,
    browseViewCount: 0,
    dailyAffirmationIds: [],
  },
  cachedPremiumStatus: false,
  lastPremiumCheck: null,
};

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function getUserData(): Promise<UserData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_USER_DATA,
        ...parsed,
        streak: { ...DEFAULT_USER_DATA.streak, ...(parsed.streak ?? {}) },
        preferences: {
          ...DEFAULT_USER_DATA.preferences,
          ...(parsed.preferences ?? {}),
        },
        dailyUsage: {
          ...DEFAULT_USER_DATA.dailyUsage,
          ...(parsed.dailyUsage ?? {}),
        },
      };
    }
    return DEFAULT_USER_DATA;
  } catch {
    return DEFAULT_USER_DATA;
  }
}

export async function setUserData(data: UserData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
}

export async function updateUserData(
  updater: (current: UserData) => UserData
): Promise<UserData> {
  const current = await getUserData();
  const updated = updater(current);
  await setUserData(updated);
  return updated;
}

function freshDailyUsage(today: string): UserData['dailyUsage'] {
  return {
    date: today,
    todaySwipeCount: 0,
    browseViewCount: 0,
    dailyAffirmationIds: [],
  };
}

export async function getDailyUsage(): Promise<{
  todaySwipeCount: number;
  browseViewCount: number;
}> {
  const data = await getUserData();
  const today = getTodayKey();
  if (data.dailyUsage.date !== today) {
    const updated: UserData = {
      ...data,
      dailyUsage: freshDailyUsage(today),
    };
    await setUserData(updated);
    return { todaySwipeCount: 0, browseViewCount: 0 };
  }
  return {
    todaySwipeCount: data.dailyUsage.todaySwipeCount,
    browseViewCount: data.dailyUsage.browseViewCount,
  };
}

export async function incrementSwipeCount(): Promise<number> {
  const data = await getUserData();
  const today = getTodayKey();
  const usage =
    data.dailyUsage.date === today
      ? { ...data.dailyUsage }
      : freshDailyUsage(today);
  usage.todaySwipeCount += 1;
  await setUserData({ ...data, dailyUsage: usage });
  return usage.todaySwipeCount;
}

export async function incrementBrowseCount(): Promise<number> {
  const data = await getUserData();
  const today = getTodayKey();
  const usage =
    data.dailyUsage.date === today
      ? { ...data.dailyUsage }
      : freshDailyUsage(today);
  usage.browseViewCount += 1;
  await setUserData({ ...data, dailyUsage: usage });
  return usage.browseViewCount;
}

export async function toggleFavorite(affirmationId: string): Promise<string[]> {
  const data = await getUserData();
  const isFav = data.favorites.includes(affirmationId);
  const favorites = isFav
    ? data.favorites.filter((id) => id !== affirmationId)
    : [affirmationId, ...data.favorites];
  await setUserData({ ...data, favorites });
  return favorites;
}

export async function setSelectedCategories(
  categoryIds: string[]
): Promise<void> {
  await updateUserData((current) => ({
    ...current,
    preferences: { ...current.preferences, selectedCategories: categoryIds },
  }));
}

export async function setHasSeenOnboarding(value: boolean): Promise<void> {
  await updateUserData((current) => ({
    ...current,
    preferences: { ...current.preferences, hasSeenOnboarding: value },
  }));
}

export async function setCachedPremiumStatus(value: boolean): Promise<void> {
  await updateUserData((current) => ({
    ...current,
    cachedPremiumStatus: value,
    lastPremiumCheck: new Date().toISOString(),
  }));
}

export async function getCachedPremiumStatus(): Promise<boolean> {
  const data = await getUserData();
  return data.cachedPremiumStatus;
}

export async function getOrCreateDailyAffirmationIds(
  pickFresh: () => string[]
): Promise<string[]> {
  const data = await getUserData();
  const today = getTodayKey();
  if (
    data.dailyUsage.date === today &&
    data.dailyUsage.dailyAffirmationIds.length > 0
  ) {
    return data.dailyUsage.dailyAffirmationIds;
  }
  const ids = pickFresh();
  const usage =
    data.dailyUsage.date === today
      ? { ...data.dailyUsage, dailyAffirmationIds: ids }
      : {
          date: today,
          todaySwipeCount: 0,
          browseViewCount: 0,
          dailyAffirmationIds: ids,
        };
  await setUserData({ ...data, dailyUsage: usage });
  return ids;
}
