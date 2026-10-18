import { useEffect, useState, useSyncExternalStore } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  getAdsAllowed,
  getAdsPersonalized,
  getBannerAdUnitId,
  subscribeAdsAllowed,
} from '../services/ads';
import { usePremium } from '../context/PremiumContext';
import { trackEvent } from '../services/analytics';
import { C } from '../theme/colors';

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

  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (isPremium || !adsAllowed || failed) return null;

  // Takes no space until an ad has loaded, and disappears if one fails, so
  // nobody sees an empty strip or placeholder text.
  return (
    <View style={loaded ? styles.container : styles.hidden}>
      <BannerAd
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: !getAdsPersonalized() }}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: C.bg0,
  },
  // Before the first ad the banner view has no size, so this strip is empty
  hidden: {
    alignItems: 'center',
    width: '100%',
  },
});
