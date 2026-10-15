import { useEffect } from 'react';
import { PaywallVariantA } from '../src/components/paywall/PaywallVariantA';
import { trackEvent } from '../src/services/analytics';

// The A, B, C paywall test ended Oct 15 2026: too little traffic to read a
// winner, and variant C's countdown and struck through price were not a real
// offer. Everyone sees variant A, which sells the free week when eligible.
export default function PaywallScreen() {
  useEffect(() => {
    trackEvent('paywall_shown', { variant: 'A' });
  }, []);

  return <PaywallVariantA />;
}
