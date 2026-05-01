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
};

export async function getUserData(): Promise<UserData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_USER_DATA, ...JSON.parse(raw) };
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
