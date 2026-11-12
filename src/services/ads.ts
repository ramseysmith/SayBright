import { Platform } from 'react-native';
import { mayShowInterstitial, markInterstitialShown } from '../lib/ad-policy';
import {
  InterstitialAd,
  AdEventType,
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

const REAL_INTERSTITIAL_IOS = 'ca-app-pub-8327362355420246/4571005281';
const REAL_INTERSTITIAL_ANDROID = 'ca-app-pub-8327362355420246/4571005281';
const REAL_BANNER_IOS = 'ca-app-pub-8327362355420246/1617538888';
const REAL_BANNER_ANDROID = 'ca-app-pub-8327362355420246/1617538888';

// Test ads in dev and in local simulator and emulator builds (eas.json android-sim)
const USE_TEST_ADS = __DEV__ || process.env.EXPO_PUBLIC_USE_TEST_ADS === 'true';

const AD_UNITS = {
  interstitial: USE_TEST_ADS
    ? TestIds.INTERSTITIAL
    : Platform.OS === 'ios'
      ? REAL_INTERSTITIAL_IOS
      : REAL_INTERSTITIAL_ANDROID,
  banner: USE_TEST_ADS
    ? TestIds.BANNER
    : Platform.OS === 'ios'
      ? REAL_BANNER_IOS
      : REAL_BANNER_ANDROID,
};

let interstitialAd: InterstitialAd | null = null;
let isInterstitialLoaded = false;

// App Tracking Transparency has to be answered before the ad SDK collects
// anything. On iOS nothing loads until allowAds() runs; other platforms have no
// ATT requirement so they start open.
let adsAllowed = Platform.OS !== 'ios';
const adsAllowedListeners = new Set<() => void>();

// Personalized ads only when the person allowed tracking in the ATT prompt.
let personalized = false;

export function getAdsPersonalized(): boolean {
  return personalized;
}

export function allowAds(trackingGranted = false): void {
  personalized = trackingGranted;
  if (adsAllowed) return;
  adsAllowed = true;
  adsAllowedListeners.forEach((listener) => listener());
}

export function getAdsAllowed(): boolean {
  return adsAllowed;
}

export function subscribeAdsAllowed(listener: () => void): () => void {
  adsAllowedListeners.add(listener);
  return () => adsAllowedListeners.delete(listener);
}

export function preloadInterstitial(): void {
  if (!adsAllowed) return;
  try {
    interstitialAd = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
      requestNonPersonalizedAdsOnly: !personalized,
    });

    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      isInterstitialLoaded = true;
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      isInterstitialLoaded = false;
      preloadInterstitial();
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
      isInterstitialLoaded = false;
    });

    interstitialAd.load();
  } catch (error) {
    console.warn('Interstitial preload failed', error);
  }
}

/**
 * The only way screens show a full screen ad. Graysmith Labs rules (Drift
 * 1.18.0, src/lib/ad-policy.ts): never while busy, never before the first
 * finished daily set, at most one per session, not in the first two minutes.
 * Callers check Premium first.
 */
export async function maybeShowInterstitial(busy = false): Promise<boolean> {
  if (!(await mayShowInterstitial(busy))) return false;
  const shown = showInterstitial();
  if (shown) markInterstitialShown();
  return shown;
}

function showInterstitial(): boolean {
  if (isInterstitialLoaded && interstitialAd) {
    try {
      interstitialAd.show();
      // Lazy import to avoid circular deps with analytics
      import('./analytics').then(({ trackEvent }) => {
        trackEvent('ad_interstitial_shown');
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function getBannerAdUnitId(): string {
  return AD_UNITS.banner;
}

export { BannerAd, BannerAdSize };
