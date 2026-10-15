/**
 * Free trial helpers for the paywall.
 *
 * Apple decides who may start a free trial (one per subscription group per
 * Apple ID), and RevenueCat reports that eligibility. The paywall only sells
 * the free week when the selected product has a free introductory offer and
 * RevenueCat says the user is eligible. Everyone else sees the plain price.
 *
 * After a purchase that started a trial, a local reminder is scheduled two days
 * before the trial ends, so nobody is surprised by the first charge.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

/** Fixed id so the daily reminder code can keep this one when it reschedules */
export const TRIAL_REMINDER_ID = 'trial-ending-reminder';

/** Cancels every scheduled notification except the trial ending reminder. */
export async function cancelAllExceptTrialReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier !== TRIAL_REMINDER_ID)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export type TrialOffer = {
  /** Trial length in days, for example 7 */
  days: number;
  /** "free week" for 7 days, otherwise "7 day free trial" style wording */
  label: string;
};

const UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** The free introductory offer on a product, or null when there is none. */
export function freeTrialOf(product: PurchasesStoreProduct | undefined | null): TrialOffer | null {
  const intro = product?.introPrice;
  if (!intro || intro.price !== 0) return null;
  const days = (UNIT_DAYS[intro.periodUnit] ?? 0) * intro.periodNumberOfUnits * Math.max(1, intro.cycles);
  if (days <= 0) return null;
  return { days, label: days === 7 ? 'free week' : `${days} day free trial` };
}

/**
 * True when RevenueCat reports the user may still take the introductory offer
 * on this product. Unknown counts as not eligible, so we never promise a trial
 * Apple will not give.
 */
export async function isTrialEligible(productId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
    return result[productId]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
  } catch {
    return false;
  }
}

/** The date the trial would end if it started now. */
export function trialEndDate(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function formatRenewalDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

/**
 * Schedules a reminder two days before the trial ends (or one day for short
 * trials). Asks for notification permission only if it was never asked.
 */
export async function scheduleTrialEndingReminder(
  trial: TrialOffer,
  priceString: string,
  appName: string,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') {
      ({ status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      }));
    }
    if (status !== 'granted') return;

    const leadDays = trial.days > 3 ? 2 : 1;
    const fireAt = trialEndDate(trial.days - leadDays);
    const renewal = formatRenewalDate(trialEndDate(trial.days));
    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_REMINDER_ID,
      content: {
        title: `Your ${appName} trial ends in ${leadDays === 1 ? 'a day' : `${leadDays} days`}`,
        body: `Premium renews at ${priceString} on ${renewal}. Keep it, or cancel anytime in Settings before then.`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  } catch {
    // A missing reminder must never break a purchase.
  }
}
