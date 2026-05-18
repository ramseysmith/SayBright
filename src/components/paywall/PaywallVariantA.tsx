import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { URLS } from '../../constants/urls';
import { usePaywallController } from '../../hooks/usePaywallController';
import { paywallStyles as s } from './sharedStyles';
import { PlanCard } from './PlanCard';

const FEATURES = [
  'Unlimited daily affirmations',
  'Browse all categories and 340+ affirmations',
  'Home screen and lock screen widgets',
  'Watermark free share cards',
  'Ad free experience',
  'Record your own affirmations',
];

export function PaywallVariantA() {
  const c = usePaywallController('A');

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.primaryGold, COLORS.warmCoral]}
        style={s.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={s.safe} edges={['top']}>
        <Pressable
          onPress={c.close}
          hitSlop={12}
          style={s.closeBtn}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={26} color={COLORS.white} />
        </Pressable>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.hero}>
            <Text style={s.heroEmoji}>✨</Text>
            <Text style={s.heroTitle}>Unlock Your Full Potential</Text>
            <Text style={s.heroSubtitle}>
              Get unlimited affirmations, all categories, widgets, and more.
            </Text>
          </View>

          {c.loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={COLORS.white} />
            </View>
          ) : c.error ? (
            <ErrorCard onRetry={c.loadOfferings} />
          ) : (
            <>
              <View style={s.card}>
                <Text style={s.cardTitle}>What you get with Premium</Text>
                {FEATURES.map((f) => (
                  <View key={f} style={s.featureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.successGreen}
                      style={s.featureIcon}
                    />
                    <Text style={s.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              <View style={s.plansRow}>
                <PlanCard
                  label="Monthly"
                  price={`${c.monthlyPrice}/mo`}
                  selected={c.selected === 'monthly'}
                  onPress={() => c.setSelected('monthly')}
                />
                <PlanCard
                  label="Annual"
                  price={`${c.annualPrice}/yr`}
                  bestValue
                  selected={c.selected === 'annual'}
                  onPress={() => c.setSelected('annual')}
                />
              </View>

              <Pressable
                onPress={c.handlePurchase}
                disabled={c.purchasing}
                style={[s.cta, c.purchasing && { opacity: 0.7 }]}
              >
                {c.purchasing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={s.ctaText}>Continue</Text>
                )}
              </Pressable>

              <Pressable
                onPress={c.handleRestore}
                disabled={c.restoring}
                style={s.restoreBtn}
              >
                <Text style={s.restoreText}>
                  {c.restoring ? 'Restoring...' : 'Restore Purchases'}
                </Text>
              </Pressable>

              <LegalSection />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

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

export function LegalSection() {
  return (
    <>
      <Text style={s.legal}>
        Payment will be charged to your Apple ID account at confirmation of
        purchase. Subscription automatically renews unless canceled at least 24
        hours before the end of the current period.
      </Text>
      <View style={s.legalLinks}>
        <Pressable
          hitSlop={8}
          onPress={() => Linking.openURL(URLS.terms).catch(() => {})}
        >
          <Text style={s.legalLink}>Terms of Service</Text>
        </Pressable>
        <Text style={s.legalDivider}>•</Text>
        <Pressable
          hitSlop={8}
          onPress={() => Linking.openURL(URLS.privacy).catch(() => {})}
        >
          <Text style={s.legalLink}>Privacy Policy</Text>
        </Pressable>
      </View>
    </>
  );
}
