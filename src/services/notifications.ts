import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

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

const REMINDER_BODIES = [
  'Open SayBright to start today bright.',
  'Tap in for a moment of brightness.',
  "Open SayBright for today's affirmation.",
  'Pause, breathe, and open SayBright.',
];

function pickReminderCopy(): { title: string; body: string } {
  const titleIndex = Math.floor(Math.random() * REMINDER_TITLES.length);
  const bodyIndex = Math.floor(Math.random() * REMINDER_BODIES.length);
  return {
    title: REMINDER_TITLES[titleIndex],
    body: REMINDER_BODIES[bodyIndex],
  };
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<string | null> {
  await cancelAllReminders();

  try {
    const { title, body } = pickReminderCopy();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { screen: 'today' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  } catch (error) {
    console.warn('Failed to schedule reminder', error);
    return null;
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
