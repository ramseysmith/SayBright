import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** The one Android notification channel SayBright posts to. */
export const REMINDER_CHANNEL_ID = 'reminders';

/**
 * Android 13 and later only shows the permission prompt once a channel exists,
 * so call this before requestPermissionsAsync. No op on iOS and web.
 */
export async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {
    // A missing channel must never break the caller.
  }
}
