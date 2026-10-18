import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import PaywallView from '../src/components/paywall/PaywallView';
import { trackEvent } from '../src/services/analytics';

// One paywall since the 1.3.0 refresh (the A, B, C test ended Oct 15 2026).
// The headline follows where it was opened from.
export default function PaywallScreen() {
  const { source } = useLocalSearchParams<{ source?: string }>();

  useEffect(() => {
    trackEvent('paywall_shown', { variant: 'refresh', source: source ?? 'unknown' });
  }, [source]);

  return <PaywallView source={source ?? 'unknown'} />;
}
