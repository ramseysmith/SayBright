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

interface Testimonial {
  text: string;
  author: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    text: 'I look forward to my morning affirmation every day.',
    author: 'Sarah K.',
  },
  {
    text: 'The career affirmations helped me land my dream job.',
    author: 'Marcus T.',
  },
  {
    text: 'The daily reminder keeps me consistent. 90 day streak.',
    author: 'Priya M.',
  },
];

export function PaywallVariantB() {
  const c = usePaywallController('B');

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
              Join thousands building a brighter mindset.
            </Text>
          </View>

          <View style={s.socialRow}>
            <View style={s.socialStars}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Ionicons
                  key={i}
                  name="star"
                  size={14}
                  color={COLORS.primaryGold}
                  style={{ marginRight: 2 }}
                />
              ))}
              <Text style={s.socialStarText}>4.8 stars</Text>
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
                <Text style={s.cardTitle}>What members are saying</Text>
                {TESTIMONIALS.map((t) => (
                  <View key={t.author} style={s.testimonial}>
                    <Text style={s.testimonialText}>“{t.text}”</Text>
                    <Text style={s.testimonialAuthor}>{t.author}</Text>
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
                  saving="Save 44%"
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
                  <Text style={s.ctaText}>Start Your Journey</Text>
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
