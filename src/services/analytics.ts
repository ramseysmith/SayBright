import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

export type AnalyticsEvent =
  | 'app_open'
  | 'onboarding_complete'
  | 'affirmation_viewed'
  | 'affirmation_favorited'
  | 'affirmation_shared'
  | 'affirmation_recorded'
  | 'streak_incremented'
  | 'streak_milestone'
  | 'paywall_shown'
  | 'paywall_dismissed'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_cancelled'
  | 'purchase_restored'
  | 'ad_interstitial_shown'
  | 'ad_banner_shown'
  | 'widget_tapped'
  | 'category_viewed'
  | 'review_prompted'
  | 'notification_enabled'
  | 'notification_disabled'
  | 'recording_created'
  | 'recording_played'
  | 'custom_affirmation_created'
  | 'custom_affirmation_deleted'
  | 'daily_set_finished'
  | 'onboarding_affirmation_said';

type EventValue = string | number | boolean | null | undefined;

export interface EventProperties {
  [key: string]: EventValue;
}

export function trackEvent(
  event: AnalyticsEvent,
  properties?: EventProperties
): void {
  if (__DEV__) {
    console.log(`[Analytics] ${event}`, properties ?? '');
  }
  updateRevenueCatAttributes(event, properties).catch(() => {});
  sendToPostHog(event, properties);
}

/**
 * Anonymous product analytics, the fixed Graysmith Labs event list:
 * onboarding_complete, core_action, success_moment, reminder_opt_in,
 * paywall_view {source}, trial_start, purchase, restore.
 *
 * Same approach as Drift (src/lib/analytics.ts there): PostHog's capture API over
 * plain fetch, no native SDK, and only when EXPO_PUBLIC_POSTHOG_KEY is set in the
 * build. No identify call and no device ids: each install gets a random id. Off in
 * development and on web. A failed send is dropped and never affects the app.
 *
 * SayBright's own events map onto that list here, so screens keep calling
 * trackEvent. Only labels in SAFE_PROPS leave the device, never affirmation text,
 * ids or recordings. Events with no mapping stay local.
 */
type PortfolioEvent =
  | 'onboarding_complete'
  | 'core_action'
  | 'success_moment'
  | 'reminder_opt_in'
  | 'paywall_view'
  | 'trial_start'
  | 'purchase'
  | 'restore';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const ID_KEY = 'saybright.analyticsId.v1';
const posthogEnabled = !!POSTHOG_KEY && !__DEV__ && Platform.OS !== 'web';
const SAFE_PROPS = ['source', 'plan', 'kind', 'milestone', 'categoryId'] as const;

function toPortfolioEvent(
  event: AnalyticsEvent,
  properties?: EventProperties
): [PortfolioEvent, Record<string, string | number | boolean>][] {
  switch (event) {
    case 'onboarding_complete':
      return properties?.remindersEnabled
        ? [['onboarding_complete', {}], ['reminder_opt_in', { source: 'onboarding' }]]
        : [['onboarding_complete', {}]];
    case 'affirmation_viewed':
      return [['core_action', { kind: 'view' }]];
    case 'affirmation_favorited':
      return [['success_moment', { kind: 'favorite' }]];
    case 'affirmation_shared':
      return [['success_moment', { kind: 'share' }]];
    case 'recording_created':
      return [['success_moment', { kind: 'recording' }]];
    case 'custom_affirmation_created':
      return [['success_moment', { kind: 'custom' }]];
    case 'streak_milestone':
      return [['success_moment', { kind: 'streak' }]];
    case 'daily_set_finished':
      return [['success_moment', { kind: 'daily_set' }]];
    case 'onboarding_affirmation_said':
      return [['core_action', { kind: 'onboarding_said' }]];
    case 'notification_enabled':
      return [['reminder_opt_in', { source: 'settings' }]];
    case 'paywall_shown':
      return [['paywall_view', {}]];
    case 'purchase_completed':
      return [[properties?.trial ? 'trial_start' : 'purchase', {}]];
    case 'purchase_restored':
      return [['restore', {}]];
    default:
      return [];
  }
}

function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let idPromise: Promise<string> | null = null;
function installId(): Promise<string> {
  if (!idPromise) {
    idPromise = (async () => {
      try {
        const existing = await AsyncStorage.getItem(ID_KEY);
        if (existing) return existing;
        const fresh = randomId();
        await AsyncStorage.setItem(ID_KEY, fresh);
        return fresh;
      } catch {
        return randomId();
      }
    })();
  }
  return idPromise;
}

function sendToPostHog(event: AnalyticsEvent, properties?: EventProperties): void {
  if (!posthogEnabled) return;
  const mapped = toPortfolioEvent(event, properties);
  if (mapped.length === 0) return;
  const safe: Record<string, string | number | boolean> = {};
  for (const key of SAFE_PROPS) {
    const value = properties?.[key];
    if (value !== undefined && value !== null) safe[key] = value;
  }
  (async () => {
    try {
      const distinctId = await installId();
      for (const [name, extra] of mapped) {
        await fetch(`${POSTHOG_HOST}/capture/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: POSTHOG_KEY,
            event: name,
            distinct_id: distinctId,
            properties: {
              ...safe,
              ...extra,
              $process_person_profile: false,
              app: 'saybright',
              app_version: Constants.expoConfig?.version ?? 'unknown',
              platform: Platform.OS,
            },
          }),
        });
      }
    } catch {
      // Analytics must never get in the way of the affirmations
    }
  })();
}

async function updateRevenueCatAttributes(
  event: AnalyticsEvent,
  properties?: EventProperties
): Promise<void> {
  try {
    switch (event) {
      case 'onboarding_complete':
        await Purchases.setAttributes({ onboarding_completed: 'true' });
        break;
      case 'streak_milestone':
        if (properties?.milestone) {
          await Purchases.setAttributes({
            highest_milestone: String(properties.milestone),
          });
        }
        break;
      case 'affirmation_favorited':
        if (properties?.totalFavorites !== undefined) {
          await Purchases.setAttributes({
            total_favorites: String(properties.totalFavorites),
          });
        }
        break;
      case 'recording_created':
        await Purchases.setAttributes({ has_recordings: 'true' });
        break;
      case 'streak_incremented':
        if (properties?.current !== undefined) {
          await Purchases.setAttributes({
            current_streak: String(properties.current),
          });
        }
        break;
    }
  } catch {
    // ignore
  }
}
