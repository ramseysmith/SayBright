import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { bundleId } from './ota';

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
  | 'purchase_failed'
  | 'paywall_plans'
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
  | 'onboarding_affirmation_said'
  | 'billing_issue_view'
  | 'billing_issue_tap'
  | 'onboarding_step'
  | 'streak_saved'
  | 'streak_save_offer'
  | 'seasonal_opened';

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
 * paywall_view and paywall_close {source, paywall_version}, trial_start and
 * purchase {source, paywall_version, plan}, restore (HQ docs/paywalls.md).
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
  | 'paywall_close'
  | 'paywall_plans'
  | 'purchase_tap'
  | 'purchase_cancel'
  | 'purchase_fail'
  | 'trial_start'
  | 'purchase'
  | 'restore'
  | 'billing_issue_view'
  | 'billing_issue_tap'
  | 'onboarding_step'
  | 'day_open'
  | 'streak_save'
  | 'seasonal_open'
  | 'review_prompt';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const ID_KEY = 'saybright.analyticsId.v1';
const posthogEnabled = !!POSTHOG_KEY && !__DEV__ && Platform.OS !== 'web' && !process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY; // never from simulator test builds
/**
 * Names the paywall that is live, sent on every paywall event. Bump it to the
 * day's date with any change to the paywall, its copy, its entry points or the
 * offer, and name it in the HQ experiments.md row (HQ docs/paywalls.md).
 */
export const PAYWALL_VERSION = 'saybright-2026-11-13';

const SAFE_PROPS = ['source', 'plan', 'kind', 'milestone', 'categoryId', 'step', 'index'] as const;

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
    case 'streak_incremented':
      // One per calendar day opened; index is the day in a row, so day 2 and
      // day 7 return can be read per install (1.4.0)
      return [['day_open', { index: Number(properties?.current ?? 0) }]];
    case 'streak_saved':
      return [['streak_save', { kind: 'saved', index: Number(properties?.current ?? 0) }]];
    case 'streak_save_offer':
      return [['streak_save', { kind: String(properties?.kind ?? 'view'), index: Number(properties?.lost ?? 0) }]];
    case 'seasonal_opened':
      return [['seasonal_open', { source: String(properties?.source ?? 'unknown') }]];
    case 'streak_milestone':
      return [['success_moment', { kind: 'streak' }]];
    case 'daily_set_finished':
      return [['success_moment', { kind: 'daily_set' }]];
    case 'review_prompted':
      return [['review_prompt', { kind: String(properties?.kind ?? 'unknown') }]];
    case 'onboarding_affirmation_said':
      return [['core_action', { kind: 'onboarding_said' }]];
    case 'notification_enabled':
      return [['reminder_opt_in', { source: 'settings' }]];
    case 'paywall_shown':
      return [['paywall_view', { source: String(properties?.source ?? 'unknown'), paywall_version: PAYWALL_VERSION }]];
    case 'paywall_dismissed':
      return [['paywall_close', { source: String(properties?.source ?? 'unknown'), paywall_version: PAYWALL_VERSION, seconds: Number(properties?.seconds ?? 0) }]];
    case 'paywall_plans':
      // What the person actually saw, once per open: did plans load, was the free
      // trial offered, and did Apple's eligibility answer or time out (section 5)
      return [['paywall_plans', {
        source: String(properties?.source ?? 'unknown'),
        paywall_version: PAYWALL_VERSION,
        status: String(properties?.status ?? 'unknown'),
        plans: Number(properties?.plans ?? 0),
        trial_shown: !!properties?.trial_shown,
        has_trial: !!properties?.has_trial,
        eligibility: String(properties?.eligibility ?? 'none'),
      }]];
    case 'purchase_started':
    case 'purchase_cancelled':
    case 'purchase_failed': {
      const name = event === 'purchase_started' ? 'purchase_tap' : event === 'purchase_cancelled' ? 'purchase_cancel' : 'purchase_fail';
      const props: Record<string, string | number | boolean> = {
        source: String(properties?.source ?? 'unknown'),
        paywall_version: PAYWALL_VERSION,
        plan: String(properties?.plan ?? 'unknown'),
        trial_shown: !!properties?.trial_shown,
      };
      if (event === 'purchase_failed') props.code = String(properties?.code ?? 'unknown');
      return [[name, props]];
    }
    case 'purchase_completed':
      return [[properties?.trial ? 'trial_start' : 'purchase', { source: String(properties?.source ?? 'unknown'), paywall_version: PAYWALL_VERSION }]];
    case 'purchase_restored':
      return [['restore', { source: String(properties?.source ?? 'unknown'), paywall_version: PAYWALL_VERSION }]];
    case 'billing_issue_view':
    case 'billing_issue_tap':
      return [[event, { kind: properties?.inGrace ? 'grace' : 'retry' }]];
    case 'onboarding_step':
      // Which onboarding step each install reached, so the drop between install
      // and onboarding_complete can be read step by step (Nov 7 2026)
      return [['onboarding_step', { step: String(properties?.step ?? 'unknown'), index: Number(properties?.index ?? -1), kind: String(properties?.kind ?? 'view') }]];
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
              bundle: bundleId(),
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
