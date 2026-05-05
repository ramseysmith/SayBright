import { Platform } from 'react-native';
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

const AD_UNITS = {
  interstitial: __DEV__
    ? TestIds.INTERSTITIAL
    : Platform.OS === 'ios'
      ? REAL_INTERSTITIAL_IOS
      : REAL_INTERSTITIAL_ANDROID,
  banner: __DEV__
    ? TestIds.BANNER
    : Platform.OS === 'ios'
      ? REAL_BANNER_IOS
      : REAL_BANNER_ANDROID,
};

let interstitialAd: InterstitialAd | null = null;
let isInterstitialLoaded = false;

export function preloadInterstitial(): void {
  try {
    interstitialAd = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
      requestNonPersonalizedAdsOnly: true,
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

export function showInterstitial(): boolean {
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
