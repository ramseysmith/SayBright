import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { usePaywallController } from '../../hooks/usePaywallController';
import { paywallStyles as s } from './sharedStyles';
import { PlanCard } from './PlanCard';
import { ErrorCard, LegalSection } from './PaywallVariantA';

const FEATURES = [
  'Unlimited daily affirmations',
  'All 10 categories with 250+ affirmations',
  'Custom reminder notifications',
  'Home screen and lock screen widgets',
  'Watermark free share cards',
  'Ad free experience',
];

function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function formatCountdown(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PaywallVariantC() {
  const c = usePaywallController('C');
  const [remaining, setRemaining] = useState(secondsUntilMidnight());

  useEffect(() => {
    const id = setInterval(() => setRemaining(secondsUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.warmCoral, COLORS.primaryGold]}
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
            <Text style={s.heroTitle}>Launch Special</Text>
            <Text style={s.heroSubtitle}>
              Lock in introductory pricing on the annual plan.
            </Text>
            <View style={s.countdownBar}>
              <Text style={s.countdownText}>
                Offer resets in {formatCountdown(remaining)}
              </Text>
            </View>
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
                  strikethroughPrice="$29.99"
                  saving="Best price"
                  bestValue
                  badgeText="Launch Special"
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
                  <Text style={s.ctaText}>Claim Your Offer</Text>
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
