import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, getBannerAdUnitId } from '../services/ads';
import { usePremium } from '../context/PremiumContext';
import { trackEvent } from '../services/analytics';

export function BannerAdWrapper() {
  const { isPremium } = usePremium();

  useEffect(() => {
    if (!isPremium) {
      trackEvent('ad_banner_shown');
    }
  }, [isPremium]);

  if (isPremium) return null;

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
