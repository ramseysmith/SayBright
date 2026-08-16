import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getDailyAffirmations, getDateKey } from '../utils/affirmations';
import { getUserData } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

const REMINDER_TITLES = [
  '☀️ Your affirmation is ready',
  '✨ Your daily moment awaits',
  '🌅 A bright thought is waiting',
  '🔥 Keep your streak going',
];

// A repeating DAILY trigger freezes its content at schedule time, so it can
// never carry that day's affirmation. Instead we queue one dated notification
// per day and top the queue up whenever the app opens. iOS caps pending
// notifications at 64, so this stays well inside the budget.
const REMINDER_DAYS_AHEAD = 14;

export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<string | null> {
  await cancelAllReminders();

  try {
    const data = await getUserData();
    const categories = data.preferences.selectedCategories;

    const now = new Date();
    let firstId: string | null = null;

    for (let offset = 0; offset < REMINDER_DAYS_AHEAD; offset++) {
      const fireDate = new Date(now);
      fireDate.setDate(fireDate.getDate() + offset);
      fireDate.setHours(hour, minute, 0, 0);

      // Today's slot has already passed; start with tomorrow.
      if (fireDate.getTime() <= now.getTime()) continue;

      const [affirmation] = getDailyAffirmations(
        getDateKey(fireDate),
        categories,
        1
      );
      if (!affirmation) continue;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: REMINDER_TITLES[offset % REMINDER_TITLES.length],
          body: affirmation.text,
          data: { screen: 'today', affirmationId: affirmation.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
        },
      });
      if (!firstId) firstId = id;
    }

    return firstId;
  } catch (error) {
    console.warn('Failed to schedule reminder', error);
    return null;
  }
}

// Re-queues the rolling window so reminders never run dry. Safe to call on
// every app open; it is a no-op when the user has reminders switched off.
export async function refreshScheduledReminders(): Promise<void> {
  try {
    const data = await getUserData();
    if (!data.preferences.reminderEnabled) return;
    const [hour, minute] = data.preferences.reminderTime
      .split(':')
      .map((part) => parseInt(part, 10));
    if (Number.isNaN(hour) || Number.isNaN(minute)) return;
    await scheduleDailyReminder(hour, minute);
  } catch (error) {
    console.warn('Failed to refresh reminders', error);
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
