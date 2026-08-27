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
import { ErrorCard, LegalSection } from './PaywallShared';

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
            </>
          )}

          <LegalSection
            monthlyPrice={c.monthlyPrice}
            annualPrice={c.annualPrice}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
