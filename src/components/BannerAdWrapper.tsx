import { useEffect, useSyncExternalStore } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  getAdsAllowed,
  getBannerAdUnitId,
  subscribeAdsAllowed,
} from '../services/ads';
import { usePremium } from '../context/PremiumContext';
import { trackEvent } from '../services/analytics';

export function BannerAdWrapper() {
  const { isPremium } = usePremium();
  // Holds the banner back until the ATT prompt has been answered, so no ad
  // request goes out before the user has had the chance to decline tracking.
  const adsAllowed = useSyncExternalStore(subscribeAdsAllowed, getAdsAllowed);

  useEffect(() => {
    if (!isPremium && adsAllowed) {
      trackEvent('ad_banner_shown');
    }
  }, [isPremium, adsAllowed]);

  if (isPremium || !adsAllowed) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
});
