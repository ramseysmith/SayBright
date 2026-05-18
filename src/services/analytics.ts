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
  | 'ad_interstitial_shown'
  | 'ad_banner_shown'
  | 'widget_tapped'
  | 'category_viewed'
  | 'review_prompted'
  | 'notification_enabled'
  | 'notification_disabled'
  | 'recording_created'
  | 'recording_played';

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
