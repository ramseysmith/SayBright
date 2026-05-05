import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../src/constants/theme';
import { getPaywallVariant, PaywallVariant } from '../src/services/purchases';
import { PaywallVariantA } from '../src/components/paywall/PaywallVariantA';
import { PaywallVariantB } from '../src/components/paywall/PaywallVariantB';
import { PaywallVariantC } from '../src/components/paywall/PaywallVariantC';
import { trackEvent } from '../src/services/analytics';

export default function PaywallScreen() {
  const [variant, setVariant] = useState<PaywallVariant | null>(null);

  useEffect(() => {
    getPaywallVariant().then((v) => {
      setVariant(v);
      trackEvent('paywall_shown', { variant: v });
    });
  }, []);

  if (!variant) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primaryGold} />
      </View>
    );
  }

  if (variant === 'B') return <PaywallVariantB />;
  if (variant === 'C') return <PaywallVariantC />;
  return <PaywallVariantA />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cream,
  },
});
