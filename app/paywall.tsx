import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../src/constants/theme';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  PRODUCT_IDS,
  PurchasesOffering,
  PurchasesPackage,
} from '../src/services/purchases';
import { usePremium } from '../src/context/PremiumContext';
import { useToast } from '../src/components/Toast';
import { URLS } from '../src/constants/urls';

const FEATURES = [
  'Unlimited daily affirmations',
  'All 10 categories with 250+ affirmations',
  'Custom reminder notifications',
  'Home screen and lock screen widgets',
  'Watermark free share cards',
  'Ad free experience',
];

type PlanKey = 'monthly' | 'annual';

interface ResolvedPackages {
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}

function resolvePackages(offering: PurchasesOffering | null): ResolvedPackages {
  if (!offering) return { monthly: null, annual: null };
  const monthly =
    offering.monthly ??
    offering.availablePackages.find(
      (p) => p.product.identifier === PRODUCT_IDS.monthly
    ) ??
    null;
  const annual =
    offering.annual ??
    offering.availablePackages.find(
      (p) => p.product.identifier === PRODUCT_IDS.annual
    ) ??
    null;
  return { monthly, annual };
}

export default function PaywallScreen() {
  const router = useRouter();
  const toast = useToast();
  const { refreshPremiumStatus } = usePremium();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [packages, setPackages] = useState<ResolvedPackages>({
    monthly: null,
    annual: null,
  });
  const [selected, setSelected] = useState<PlanKey>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadOfferings = async () => {
    setLoading(true);
    setError(false);
    const offering = await getOfferings();
    const resolved = resolvePackages(offering);
    if (!resolved.monthly && !resolved.annual) {
      setError(true);
    } else {
      setPackages(resolved);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOfferings();
  }, []);

  const close = () => router.back();

  const handlePurchase = async () => {
    const pkg = selected === 'monthly' ? packages.monthly : packages.annual;
    if (!pkg) {
      toast.show('That plan is not available right now.');
      return;
    }
    Haptics.selectionAsync();
    setPurchasing(true);
    try {
      const ok = await purchasePackage(pkg);
      if (ok) {
        await refreshPremiumStatus();
        toast.show('Welcome to SayBright Premium.');
        router.back();
      }
    } catch (err) {
      Alert.alert(
        'Purchase failed',
        'Something went wrong. Please try again in a moment.'
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const ok = await restorePurchases();
    if (ok) {
      await refreshPremiumStatus();
      toast.show('Purchases restored successfully.');
      router.back();
    } else {
      toast.show('No previous purchases found.');
    }
    setRestoring(false);
  };

  const monthlyPrice = packages.monthly?.product.priceString ?? '$2.99';
  const annualPrice = packages.annual?.product.priceString ?? '$19.99';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.primaryGold, COLORS.warmCoral]}
        style={styles.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Pressable
          onPress={close}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={26} color={COLORS.white} />
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>✨</Text>
            <Text style={styles.heroTitle}>Unlock Your Full Potential</Text>
            <Text style={styles.heroSubtitle}>
              Get unlimited affirmations, all categories, widgets, and more.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={COLORS.white} />
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                Unable to load subscription options.
              </Text>
              <Text style={styles.errorBody}>
                Please check your connection and try again.
              </Text>
              <Pressable style={styles.retryBtn} onPress={loadOfferings}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.featuresCard}>
                <Text style={styles.featuresTitle}>
                  What you get with Premium
                </Text>
                {FEATURES.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.successGreen}
                      style={styles.featureIcon}
                    />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.plansRow}>
                <PlanCard
                  label="Monthly"
                  price={`${monthlyPrice}/mo`}
                  selected={selected === 'monthly'}
                  onPress={() => setSelected('monthly')}
                />
                <PlanCard
                  label="Annual"
                  price={`${annualPrice}/yr`}
                  saving="Save 44%"
                  bestValue
                  selected={selected === 'annual'}
                  onPress={() => setSelected('annual')}
                />
              </View>

              <Pressable
                onPress={handlePurchase}
                disabled={purchasing}
                style={[
                  styles.cta,
                  purchasing && { opacity: 0.7 },
                ]}
              >
                {purchasing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.ctaText}>Continue</Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleRestore}
                disabled={restoring}
                style={styles.restoreBtn}
              >
                <Text style={styles.restoreText}>
                  {restoring ? 'Restoring...' : 'Restore Purchases'}
                </Text>
              </Pressable>

              <Text style={styles.legal}>
                Payment will be charged to your Apple ID account at confirmation
                of purchase. Subscription automatically renews unless canceled
                at least 24 hours before the end of the current period.
              </Text>

              <View style={styles.legalLinks}>
                <Pressable
                  hitSlop={8}
                  onPress={() => Linking.openURL(URLS.terms).catch(() => {})}
                >
                  <Text style={styles.legalLink}>Terms of Service</Text>
                </Pressable>
                <Text style={styles.legalDivider}>•</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => Linking.openURL(URLS.privacy).catch(() => {})}
                >
                  <Text style={styles.legalLink}>Privacy Policy</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PlanCard({
  label,
  price,
  saving,
  bestValue,
  selected,
  onPress,
}: {
  label: string;
  price: string;
  saving?: string;
  bestValue?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.planCard,
        bestValue && styles.planCardBestBg,
        selected && styles.planCardSelected,
      ]}
    >
      {bestValue ? (
        <View style={styles.bestBadge}>
          <Text style={styles.bestBadgeText}>Best Value</Text>
        </View>
      ) : null}
      <Text style={styles.planLabel}>{label}</Text>
      <Text style={styles.planPrice}>{price}</Text>
      {saving ? <Text style={styles.planSaving}>{saving}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  safe: { flex: 1 },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  heroEmoji: { fontSize: 64, marginBottom: SPACING.md },
  heroTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 32,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.body,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: SPACING.lg,
  },
  featuresTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureIcon: { marginRight: SPACING.sm },
  featureText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1,
  },
  plansRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  planCard: {
    width: '48%',
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  planCardBestBg: { backgroundColor: '#FFFDF5' },
  planCardSelected: {
    borderColor: COLORS.primaryGold,
    borderWidth: 2,
  },
  bestBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: COLORS.primaryGold,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  bestBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: COLORS.white,
  },
  planLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  planPrice: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  planSaving: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.successGreen,
    marginTop: 4,
  },
  cta: {
    backgroundColor: COLORS.primaryGold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  ctaText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: COLORS.white,
  },
  restoreBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  restoreText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  legal: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  legalLink: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  legalDivider: {
    color: COLORS.textSecondary,
    marginHorizontal: 8,
    fontSize: 11,
  },
  loadingWrap: { paddingVertical: SPACING.xxl, alignItems: 'center' },
  errorCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  errorTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  errorBody: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryBtn: {
    backgroundColor: COLORS.primaryGold,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: 999,
  },
  retryText: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
    fontSize: FONT_SIZES.body,
  },
});
