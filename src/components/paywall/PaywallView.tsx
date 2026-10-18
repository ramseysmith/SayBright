import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Tap from '../Tap';
import BrightMark from '../art/BrightMark';
import CategoryIcon from '../art/CategoryIcon';
import { usePaywallController, type PlanKey } from '../../hooks/usePaywallController';
import { C, MAX_CONTENT_WIDTH, RADIUS } from '../../theme/colors';
import { FONTS } from '../../constants/theme';
import { URLS } from '../../constants/urls';

/** Headline per place the paywall was opened from. */
const HEADLINES: Record<string, { title: string; sub: string }> = {
  daily_limit: { title: 'Keep going today', sub: 'You said your five. Premium has no daily limit.' },
  preview: { title: 'Open every category', sub: 'Career, calm, wealth, love and more, all of them.' },
  browse_locked: { title: 'Open every category', sub: 'Career, calm, wealth, love and more, all of them.' },
  record_voice: { title: 'Hear it in your voice', sub: 'Record your affirmations and play them back each day.' },
  widgets: { title: 'Brighten your home screen', sub: 'A fresh affirmation on your home screen, every day.' },
  onboarding: { title: 'Your first week is free', sub: 'Everything in SayBright, free for 7 days.' },
};
const DEFAULT_HEADLINE = { title: 'Say it brighter, every day', sub: 'Every category, no limits, no ads.' };

const BENEFITS: { icon: string; title: string; body: string }[] = [
  { icon: 'confidence', title: 'All 10 categories', body: '340+ affirmations, from calm to career' },
  { icon: 'morning', title: 'No daily limit, no ads', body: 'Swipe as long as you like' },
  { icon: 'creativity', title: 'Widgets and your own voice', body: 'Home screen widgets and affirmations recorded in your voice' },
];

export default function PaywallView({ source, onDone, embedded = false }: { source: string; onDone?: () => void; embedded?: boolean }) {
  const c = usePaywallController(source, onDone);
  const headline = HEADLINES[source] ?? DEFAULT_HEADLINE;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient colors={[C.dawnTop, C.bg2, C.bg0]} locations={[0, 0.34, 0.62]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.topBar}>
          <Tap
            onPress={c.close}
            hitSlop={12}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel={embedded ? 'Not now' : 'Close'}
          >
            {embedded ? <Text style={styles.notNow}>Not now</Text> : <Ionicons name="close" size={22} color={C.text} />}
          </Tap>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <View style={styles.hero}>
              <BrightMark size={128} />
            </View>
            <Text style={styles.title}>{headline.title}</Text>
            <Text style={styles.sub}>{headline.sub}</Text>

            <View style={styles.benefits}>
              {BENEFITS.map((b) => (
                <View key={b.title} style={styles.benefit}>
                  <View style={styles.benefitIcon}>
                    <CategoryIcon name={b.icon} size={22} color={C.goldDeep} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.benefitTitle}>{b.title}</Text>
                    <Text style={styles.benefitBody}>{b.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            {c.loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={C.accent} />
              </View>
            ) : c.error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Plans did not load</Text>
                <Text style={styles.errorBody}>Check your connection and try again.</Text>
                <Tap onPress={c.loadOfferings} style={styles.retry} accessibilityRole="button">
                  <Text style={styles.retryText}>Retry</Text>
                </Tap>
              </View>
            ) : (
              <>
                <View style={styles.plans}>
                  {c.hasAnnual ? (
                    <PlanOption
                      label="Yearly"
                      price={`${c.annualPrice} a year`}
                      badge={c.annualSavings ? `Save ${c.annualSavings}%` : 'Best value'}
                      selected={c.selected === 'annual'}
                      onPress={() => c.setSelected('annual' as PlanKey)}
                    />
                  ) : null}
                  <PlanOption
                    label="Monthly"
                    price={`${c.monthlyPrice} a month`}
                    selected={c.selected === 'monthly'}
                    onPress={() => c.setSelected('monthly' as PlanKey)}
                  />
                </View>

                {c.showTrial ? (
                  <View style={styles.timeline}>
                    <TimelineStep dot={C.gold} title="Today" body="Everything unlocks" />
                    <TimelineStep dot={C.accentLight} title={`Day ${c.reminderDay}`} body="We send a reminder" />
                    <TimelineStep dot={C.accent} title={`Day ${c.trialDays + 1}`} body="Your plan starts" last />
                  </View>
                ) : null}

              </>
            )}

            <LegalSection monthlyPrice={c.monthlyPrice} annualPrice={c.annualPrice} showAnnual={c.hasAnnual} showTrial={c.showTrial} />
          </View>
        </ScrollView>
        {!c.loading && !c.error ? (
          <SafeAreaView edges={['bottom']} style={styles.footer}>
            <View style={styles.inner}>
                      <Tap
                        onPress={c.handlePurchase}
                        disabled={c.purchasing}
                        style={[styles.cta, c.purchasing && styles.ctaBusy]}
                        pressedStyle={styles.ctaPressed}
                        accessibilityRole="button"
                      >
                        {c.purchasing ? <ActivityIndicator color={C.onGold} /> : <Text style={styles.ctaText}>{c.ctaLabel}</Text>}
                      </Tap>
                      {c.trialTerms ? <Text style={styles.terms}>{c.trialTerms}</Text> : null}
                      {c.notice ? <Text style={styles.notice}>{c.notice}</Text> : null}
      
                      <Tap onPress={c.handleRestore} disabled={c.restoring} style={styles.restore} accessibilityRole="button">
                        <Text style={styles.restoreText}>{c.restoring ? 'Restoring' : 'Restore purchases'}</Text>
                      </Tap>
            </View>
          </SafeAreaView>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function PlanOption({ label, price, badge, selected, onPress }: { label: string; price: string; badge?: string; selected: boolean; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${price}`}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.flex}>
        <Text style={styles.planLabel}>{label}</Text>
        <Text style={styles.planPrice}>{price}</Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Tap>
  );
}

function TimelineStep({ dot, title, body, last }: { dot: string; title: string; body: string; last?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        <View style={[styles.stepDot, { backgroundColor: dot }]} />
        {!last ? <View style={styles.stepLine} /> : null}
      </View>
      <View style={styles.stepText}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

/**
 * Guideline 3.1.2: subscription title, length, price and working links to the
 * Terms of Use and privacy policy, visible whether or not plans loaded (build 10
 * was rejected when this rendered only on the success path).
 */
function LegalSection({ monthlyPrice, annualPrice, showAnnual, showTrial }: { monthlyPrice: string; annualPrice: string; showAnnual: boolean; showTrial: boolean }) {
  return (
    <View style={styles.legal}>
      <Text style={styles.legalTitle}>SayBright Premium</Text>
      <Text style={styles.legalText}>Monthly: {monthlyPrice} per month, billed every month.</Text>
      {showAnnual ? <Text style={styles.legalText}>Yearly: {annualPrice} per year, billed every 12 months.</Text> : null}
      {showTrial ? (
        <Text style={styles.legalText}>
          The free trial is for eligible new subscribers. If you do not cancel at least 24 hours before it ends, the subscription
          starts and your Apple ID is charged the plan price.
        </Text>
      ) : null}
      <Text style={styles.legalText}>
        Payment is charged to your Apple ID at confirmation of purchase. The subscription renews automatically unless it is canceled at
        least 24 hours before the end of the current period, and your account is charged for renewal within 24 hours before the period
        ends. Manage or cancel it in your App Store account settings.
      </Text>
      <View style={styles.legalLinks}>
        <Tap hitSlop={10} accessibilityRole="link" onPress={() => Linking.openURL(URLS.terms).catch(() => {})}>
          <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
        </Tap>
        <Text style={styles.legalText}>  ·  </Text>
        <Tap hitSlop={10} accessibilityRole="link" onPress={() => Linking.openURL(URLS.privacy).catch(() => {})}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg0 },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 4 },
  close: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceOnSkyStrong,
  },
  notNow: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: C.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, backgroundColor: C.bg0, borderTopWidth: 1, borderTopColor: C.border },
  inner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  hero: { alignItems: 'center', marginTop: -8 },
  title: { fontFamily: FONTS.displayBold, fontSize: 30, lineHeight: 36, color: C.text, textAlign: 'center', marginTop: 2 },
  sub: { fontFamily: FONTS.bodyRegular, fontSize: 16, lineHeight: 22, color: C.textSecondary, textAlign: 'center', marginTop: 8 },
  benefits: { marginTop: 22, gap: 14 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: C.text },
  benefitBody: { fontFamily: FONTS.bodyRegular, fontSize: 14, color: C.textSecondary, marginTop: 1 },
  loading: { paddingVertical: 48, alignItems: 'center' },
  errorCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: RADIUS.md,
    backgroundColor: C.surfaceStrong,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  errorTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: C.text },
  errorBody: { fontFamily: FONTS.bodyRegular, fontSize: 14, color: C.textSecondary, marginTop: 4, textAlign: 'center' },
  retry: { marginTop: 14, paddingHorizontal: 26, paddingVertical: 10, borderRadius: 999, backgroundColor: C.accent },
  retryText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: C.onAccent },
  plans: { marginTop: 24, gap: 10 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  planSelected: { borderColor: C.accent, backgroundColor: C.surfaceStrong },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  planLabel: { fontFamily: FONTS.bodyBold, fontSize: 16, color: C.text },
  planPrice: { fontFamily: FONTS.bodyRegular, fontSize: 14, color: C.textSecondary, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBorder },
  badgeText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: C.onGold },
  timeline: { marginTop: 20, paddingHorizontal: 6 },
  step: { flexDirection: 'row', minHeight: 44 },
  stepRail: { width: 18, alignItems: 'center' },
  stepDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  stepLine: { flex: 1, width: 2, backgroundColor: C.border, marginVertical: 2 },
  stepText: { marginLeft: 12, paddingBottom: 8 },
  stepTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: C.text },
  stepBody: { fontFamily: FONTS.bodyRegular, fontSize: 14, color: C.textSecondary },
  cta: {
    marginTop: 4,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.goldDeep,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaPressed: { backgroundColor: C.goldDeep },
  ctaBusy: { opacity: 0.75 },
  ctaText: { fontFamily: FONTS.bodyBold, fontSize: 17, color: C.onGold },
  terms: { fontFamily: FONTS.bodyRegular, fontSize: 13, lineHeight: 18, color: C.textSecondary, textAlign: 'center', marginTop: 10 },
  notice: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: C.danger, textAlign: 'center', marginTop: 10 },
  restore: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginTop: 4 },
  restoreText: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: C.accent },
  legal: { marginTop: 18, gap: 6 },
  legalTitle: { fontFamily: FONTS.bodyBold, fontSize: 13, color: C.textSecondary, textAlign: 'center' },
  legalText: { fontFamily: FONTS.bodyRegular, fontSize: 12, lineHeight: 17, color: C.textMuted, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  legalLink: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: C.accent, textDecorationLine: 'underline' },
});
