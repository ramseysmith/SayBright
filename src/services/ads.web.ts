// Web export only (store screenshots). AdMob has no web SDK, so every call is a
// no op and the banner renders nothing.
export function allowAds(_trackingGranted = false): void {}
export function getAdsPersonalized(): boolean {
  return false;
}
export function getAdsAllowed(): boolean {
  return false;
}
export function subscribeAdsAllowed(_listener: () => void): () => void {
  return () => {};
}
export function preloadInterstitial(): void {}
export async function maybeShowInterstitial(): Promise<boolean> {
  return false;
}
export function getBannerAdUnitId(): string {
  return '';
}
export function BannerAd(_props: unknown): null {
  return null;
}
export const BannerAdSize = { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' };
