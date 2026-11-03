/**
 * Free trial helpers for the paywall.
 *
 * Apple decides who may start a free trial (one per subscription group per
 * Apple ID), and RevenueCat reports that eligibility. The paywall only sells
 * the free week when the selected product has a free introductory offer and
 * RevenueCat says the user is eligible. Everyone else sees the plain price.
 *
 * On Android RevenueCat's eligibility check always reports unknown, and Google
 * Play only returns the offers this user may take, so a free phase on the
 * product's default subscription option is the eligibility answer there.
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
import { ensureReminderChannel, REMINDER_CHANNEL_ID } from './notificationChannel';

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

const ISO_UNIT_DAYS: Record<string, number> = { D: 1, W: 7, M: 30, Y: 365 };

/** Days in an ISO 8601 period such as "P1W", "P7D" or "P1M"; 0 when unreadable. */
function isoPeriodDays(iso: string | undefined | null): number {
  const m = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(iso ?? '');
  if (!m) return 0;
  const [, y, mo, w, d] = m;
  return (
    Number(y ?? 0) * ISO_UNIT_DAYS.Y +
    Number(mo ?? 0) * ISO_UNIT_DAYS.M +
    Number(w ?? 0) * ISO_UNIT_DAYS.W +
    Number(d ?? 0) * ISO_UNIT_DAYS.D
  );
}

function offerOf(days: number): TrialOffer | null {
  if (days <= 0) return null;
  return { days, label: days === 7 ? 'free week' : `${days} day free trial` };
}

/** The free introductory offer on a product, or null when there is none. */
export function freeTrialOf(product: PurchasesStoreProduct | undefined | null): TrialOffer | null {
  if (Platform.OS === 'android') {
    // Play: the free phase of the default option (only eligible offers are returned)
    const free = product?.defaultOption?.freePhase;
    if (free) {
      const cycles = Math.max(1, free.billingCycleCount ?? 1);
      const days = isoPeriodDays(free.billingPeriod.iso8601) * cycles;
      if (days > 0) return offerOf(days);
    }
  }
  const intro = product?.introPrice;
  if (!intro || intro.price !== 0) return null;
  const days = (UNIT_DAYS[intro.periodUnit] ?? 0) * intro.periodNumberOfUnits * Math.max(1, intro.cycles);
  return offerOf(days);
}

/**
 * True when RevenueCat reports the user may still take the introductory offer
 * on this product. Unknown counts as not eligible, so we never promise a trial
 * Apple will not give.
 */
export async function isTrialEligible(productId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  // Play only returns offers the user may take; callers pass products freeTrialOf found a trial on
  if (Platform.OS === 'android') return true;
  try {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
    return result[productId]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
  } catch {
    return false;
  }
}

/**
 * Eligibility for several products in one call, so the paywall knows before
 * it renders and a fast tap still schedules the reminder. Unknown is false.
 */
export async function trialEligibility(productIds: string[]): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  if (Platform.OS === 'web' || productIds.length === 0) return out;
  if (Platform.OS === 'android') {
    // RevenueCat reports unknown on Android; the free phase on the product is the answer
    for (const id of productIds) out[id] = true;
    return out;
  }
  try {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
    for (const id of productIds) {
      out[id] = result[id]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
    }
  } catch {
    // leave everything ineligible
  }
  return out;
}

/** Days before the trial ends that the reminder fires. */
export function reminderLeadDays(trialDays: number): number {
  return trialDays > 3 ? 2 : 1;
}

/** "2 days" or "a day", matching reminderLeadDays. */
export function reminderLeadLabel(trialDays: number): string {
  const d = reminderLeadDays(trialDays);
  return d === 1 ? 'a day' : `${d} days`;
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
    // Android needs the channel before the permission prompt can show
    await ensureReminderChannel();
    let { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') {
      ({ status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      }));
    }
    if (status !== 'granted') return;

    const leadDays = reminderLeadDays(trial.days);
    const fireAt = trialEndDate(trial.days - leadDays);
    const renewal = formatRenewalDate(trialEndDate(trial.days));
    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_REMINDER_ID,
      content: {
        title: `Your ${appName} trial ends in ${leadDays === 1 ? 'a day' : `${leadDays} days`}`,
        body: `Premium renews at ${priceString} on ${renewal}. Keep it, or cancel anytime in ${
          Platform.OS === 'android' ? 'Google Play' : 'Settings'
        } before then.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  } catch {
    // A missing reminder must never break a purchase.
  }
}
