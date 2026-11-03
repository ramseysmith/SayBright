// Store links that are right on both platforms. Copied into each app by the
// android-port skill (HQ templates/app/src/lib/stores.ts); fill in the two ids.
//
// Never hardcode apps.apple.com in a screen: Android users would be sent to the
// App Store to rate, manage a subscription or download. The Android doctor fails
// any file that does.
import { Linking, Platform } from 'react-native';

export const APP_STORE_ID = '6767243151';
export const PLAY_PACKAGE = 'com.graysmithlabs.saybright';

export const isAndroid = Platform.OS === 'android';

/** Public listing for this app on the store the user is on. Use for share cards and referral links. */
export function listingUrl(platform: string = Platform.OS): string {
  return platform === 'android'
    ? `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`
    : `https://apps.apple.com/app/id${APP_STORE_ID}`;
}

/** One link that works for everyone (shared text read on either platform). */
export const universalUrl = `https://graysmithlabs.com/apps/${PLAY_PACKAGE.split('.').pop()}.html`;

/** Write a review page. Prefer expo-store-review first; this is the fallback button. */
export function reviewUrl(): string {
  return isAndroid
    ? `market://details?id=${PLAY_PACKAGE}&showAllReviews=true`
    : `itms-apps://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
}

/** Where the user cancels or changes a subscription. sku is the store product id when known. */
export function manageSubscriptionsUrl(sku?: string): string {
  if (!isAndroid) return 'https://apps.apple.com/account/subscriptions';
  const base = 'https://play.google.com/store/account/subscriptions';
  return sku ? `${base}?sku=${encodeURIComponent(sku.split(':')[0])}&package=${PLAY_PACKAGE}` : base;
}

/** Store wording for buttons and fine print. */
export const storeName = isAndroid ? 'Google Play' : 'the App Store';

/** The account a purchase is charged to and restored from: "your Apple ID" or "your Google Play account". */
export const storeAccount = isAndroid ? 'your Google Play account' : 'your Apple ID';

/** Where the person cancels, for paywall fine print. */
export const manageHint = isAndroid
  ? 'Manage or cancel it in Google Play, Payments and subscriptions, Subscriptions.'
  : 'Manage or cancel it in Settings, Apple ID, Subscriptions.';

/** Terms that govern the purchase: Apple's standard EULA on iOS, Google Play's terms on Android. */
export const purchaseTermsUrl = isAndroid
  ? 'https://play.google.com/about/play-terms/'
  : 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Another Graysmith Labs app, on this user's store. */
export function otherAppUrl(app: { appStoreId: string; playPackage?: string | null }): string | null {
  if (isAndroid) return app.playPackage ? `https://play.google.com/store/apps/details?id=${app.playPackage}` : null;
  return `https://apps.apple.com/app/id${app.appStoreId}`;
}

export async function openReview(): Promise<void> {
  const url = reviewUrl();
  try {
    await Linking.openURL(url);
  } catch {
    if (isAndroid) await Linking.openURL(listingUrl('android')).catch(() => {});
  }
}

export async function openManageSubscriptions(sku?: string): Promise<void> {
  await Linking.openURL(manageSubscriptionsUrl(sku)).catch(() => {});
}
