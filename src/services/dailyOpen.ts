/**
 * app_open: one event per install per calendar day, on launch and whenever the app
 * comes back to the foreground on a new day (HQ Backlog, Core audience 1, Nov 16 2026).
 *
 * Screen mount events miss the most common daily return on iOS: the app was only
 * suspended overnight, so tapping tomorrow's reminder brings it back without
 * remounting anything. The nightly report's retention table counts days seen per
 * install, so this is what makes day 2 and day 7 return real.
 *
 * Properties: days_since_install (days since the first app_open on this install),
 * from_notification (a notification was tapped in the last 10 minutes) and
 * reminders_on (any notification is scheduled). Counts and flags only.
 * Copy this file into an app and pass it the app's analytics sender.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

export type DailyOpenProps = { days_since_install: number; from_notification: boolean; reminders_on: boolean };

function localDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function startDailyOpen(prefix: string, send: (props: DailyOpenProps) => void): () => void {
  const lastKey = `${prefix}.dailyOpen.last.v1`;
  const firstKey = `${prefix}.dailyOpen.first.v1`;
  let busy = false;

  const check = async () => {
    if (busy) return;
    busy = true;
    try {
      const day = localDay();
      const [[, last], [, first]] = await AsyncStorage.multiGet([lastKey, firstKey]);
      if (last === day) return;
      const firstDay = first ?? day;
      await AsyncStorage.multiSet(first ? [[lastKey, day]] : [[lastKey, day], [firstKey, day]]);
      const days = Math.max(0, Math.round((Date.parse(day) - Date.parse(firstDay)) / 86400000));
      let fromNotification = false;
      let remindersOn = false;
      try {
        const r = await Notifications.getLastNotificationResponseAsync();
        fromNotification = !!r && Date.now() - Number(r.notification.date) < 10 * 60 * 1000;
      } catch {
        // No notification module on this platform
      }
      try {
        remindersOn = (await Notifications.getAllScheduledNotificationsAsync()).length > 0;
      } catch {
        // Same
      }
      send({ days_since_install: days, from_notification: fromNotification, reminders_on: remindersOn });
    } catch {
      // Analytics never gets in the way of the app
    } finally {
      busy = false;
    }
  };

  check();
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') check();
  });
  return () => sub.remove();
}
