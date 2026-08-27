import { View, Text, Pressable, Linking } from 'react-native';
import { URLS } from '../../constants/urls';
import { paywallStyles as s } from './sharedStyles';

export function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={s.errorCard}>
      <Text style={s.errorTitle}>Unable to load subscription options.</Text>
      <Text style={s.errorBody}>
        Please check your connection and try again.
      </Text>
      <Pressable style={s.retryBtn} onPress={onRetry}>
        <Text style={s.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

interface LegalSectionProps {
  monthlyPrice: string;
  annualPrice: string;
}

/**
 * Guideline 3.1.2(c) requires the subscription title, length, price, and
 * functional links to the Terms of Use (EULA) and privacy policy to be visible
 * in the app itself. This renders outside the loading/error branches of every
 * paywall variant on purpose: when StoreKit fails to return products the
 * reviewer still has to see all four things, and rendering it only on the
 * success path is what got build 10 rejected.
 */
export function LegalSection({ monthlyPrice, annualPrice }: LegalSectionProps) {
  return (
    <View style={s.legalWrap}>
      <Text style={s.legalTitle}>SayBright Premium</Text>

      <Text style={s.legalPlan}>
        Monthly: {monthlyPrice} per month, billed every month.
      </Text>
      <Text style={s.legalPlan}>
        Annual: {annualPrice} per year, billed every 12 months.
      </Text>

      <Text style={s.legal}>
        Payment is charged to your Apple ID account at confirmation of purchase.
        The subscription renews automatically unless it is canceled at least 24
        hours before the end of the current period, and your account is charged
        for renewal within 24 hours before the period ends. You can manage or
        cancel your subscription in your App Store account settings.
      </Text>

      <View style={s.legalLinks}>
        <Pressable
          hitSlop={12}
          accessibilityRole="link"
          accessibilityLabel="Terms of Use, E U L A"
          onPress={() => Linking.openURL(URLS.terms).catch(() => {})}
        >
          <Text style={s.legalLink}>Terms of Use (EULA)</Text>
        </Pressable>
        <Text style={s.legalDivider}>•</Text>
        <Pressable
          hitSlop={12}
          accessibilityRole="link"
          accessibilityLabel="Privacy Policy"
          onPress={() => Linking.openURL(URLS.privacy).catch(() => {})}
        >
          <Text style={s.legalLink}>Privacy Policy</Text>
        </Pressable>
      </View>
    </View>
  );
}
