import AsyncStorage from '@react-native-async-storage/async-storage';

const WIDGET_DATA_KEY = '@saybright_widget_data';

export interface WidgetData {
  affirmationText: string;
  categoryEmoji: string;
  categoryName: string;
  streakCount: number;
  lastUpdated: string;
}

const FREE_TIER_MESSAGE = 'Upgrade to SayBright Premium for daily widget updates ✨';

export async function updateWidgetData(
  data: WidgetData,
  isPremium: boolean
): Promise<void> {
  try {
    const payload: WidgetData = isPremium
      ? data
      : {
          ...data,
          affirmationText: FREE_TIER_MESSAGE,
          categoryEmoji: '✨',
          categoryName: 'SayBright',
        };
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to update widget data:', error);
  }
}

export async function getWidgetData(): Promise<WidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? (JSON.parse(raw) as WidgetData) : null;
  } catch {
    return null;
  }
}
