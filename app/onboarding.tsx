import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../src/constants/theme';
import { C, MAX_CONTENT_WIDTH, RADIUS, SKIES } from '../src/theme/colors';
import { CategoryPicker } from '../src/components/CategoryPicker';
import { setHasSeenOnboarding, setSelectedCategories, toggleFavorite, updateUserData } from '../src/services/storage';
import { trackEvent } from '../src/services/analytics';
import { requestNotificationPermissions, scheduleDailyReminder } from '../src/services/notifications';
import { getDailyAffirmations, getDisplayInfo, getTodayKey } from '../src/utils/affirmations';
import { FREE_DAILY_LIMIT } from '../src/lib/free-tier';
import BrightMark from '../src/components/art/BrightMark';
import CategoryIcon from '../src/components/art/CategoryIcon';
import PaywallView from '../src/components/paywall/PaywallView';
import Tap from '../src/components/Tap';
import { useOnboardingFlow } from './_layout';

/**
 * Onboarding (refresh 1.3.0, the Drift pattern):
 * 1. Welcome with the mark.
 * 2. Pick your focus.
 * 3. Say your first affirmation for real (today's first one, the same the Today
 *    tab and the reminder will show).
 * 4. The daily reminder, asked at the moment it makes sense.
 * 5. The free week paywall, with "Not now" always visible.
 */
type Step = 'welcome' | 'focus' | 'first' | 'reminder' | 'paywall';
const STEPS: Step[] = ['welcome', 'focus', 'first', 'reminder', 'paywall'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useOnboardingFlow();
  const [step, setStep] = useState<Step>('welcome');
  const [selected, setSelected] = useState<string[]>(['confidence', 'gratitude']);
  const [reminder, setReminder] = useState<{ enabled: boolean; time: string }>({ enabled: false, time: '08:00' });
  const index = STEPS.indexOf(step);

  const go = (next: Step) => {
    Haptics.selectionAsync().catch(() => {});
    setStep(next);
  };

  const finish = async () => {
    await setSelectedCategories(selected);
    await updateUserData((current) => ({
      ...current,
      preferences: { ...current.preferences, reminderEnabled: reminder.enabled, reminderTime: reminder.time },
    }));
    await setHasSeenOnboarding(true);
    trackEvent('onboarding_complete', { categoriesSelected: selected.length, remindersEnabled: reminder.enabled });
    completeOnboarding();
    router.replace('/(tabs)');
  };

  if (step === 'paywall') {
    return (
      <Animated.View style={styles.flex} entering={FadeIn.duration(250)}>
        <PaywallView source="onboarding" embedded onDone={finish} />
      </Animated.View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={step === 'first' ? SKIES.morning.colors : [C.dawnTop, C.bg2, C.bg0]}
        locations={step === 'first' ? undefined : [0, 0.4, 0.75]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.column}>
          <View style={styles.topBar}>
            {index > 0 ? (
              <Tap onPress={() => go(STEPS[index - 1])} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
                <Ionicons name="chevron-back" size={22} color={C.text} />
              </Tap>
            ) : (
              <View style={styles.back} />
            )}
            <View style={styles.dots}>
              {STEPS.map((s, i) => (
                <View key={s} style={[styles.dot, i === index ? styles.dotOn : null, i < index ? styles.dotDone : null]} />
              ))}
            </View>
            <View style={styles.back} />
          </View>

          <Animated.View key={step} style={styles.flex} entering={FadeIn.duration(260)} exiting={FadeOut.duration(120)}>
            {step === 'welcome' ? <Welcome onNext={() => go('focus')} /> : null}
            {step === 'focus' ? <Focus selected={selected} onChange={setSelected} onNext={() => go('first')} /> : null}
            {step === 'first' ? <FirstAffirmation selected={selected} onNext={() => go('reminder')} /> : null}
            {step === 'reminder' ? (
              <Reminder
                onDone={(enabled, time) => {
                  setReminder({ enabled, time });
                  trackEvent('paywall_shown', { variant: 'refresh', source: 'onboarding' });
                  go('paywall');
                }}
              />
            ) : null}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      style={[styles.primary, disabled ? styles.primaryDisabled : null]}
      pressedStyle={styles.primaryPressed}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <LinearGradient colors={[C.buttonFrom, C.buttonTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Text style={styles.primaryText}>{label}</Text>
    </Tap>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  const { height } = useWindowDimensions();
  return (
    <View style={styles.page}>
      <View style={styles.center}>
        <BrightMark size={Math.min(220, height * 0.26)} />
        <Text style={styles.bigTitle}>Say it bright</Text>
        <Text style={styles.body}>
          {`${FREE_DAILY_LIMIT} affirmations a day, picked for what you want more of. Say them out loud and start the day on your side.`}
        </Text>
      </View>
      <PrimaryButton label="Get started" onPress={onNext} />
    </View>
  );
}

function Focus({ selected, onChange, onNext }: { selected: string[]; onChange: (ids: string[]) => void; onNext: () => void }) {
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.focusScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What do you want more of?</Text>
        <Text style={styles.body}>Pick up to four. You can change them anytime in Settings.</Text>
        <View style={styles.picker}>
          <CategoryPicker selectedIds={selected} onChange={onChange} isPremium={false} maxSelections={4} />
        </View>
      </ScrollView>
      <PrimaryButton label="Continue" onPress={onNext} disabled={selected.length === 0} />
    </View>
  );
}

function FirstAffirmation({ selected, onNext }: { selected: string[]; onNext: () => void }) {
  const affirmation = useMemo(() => getDailyAffirmations(getTodayKey(), selected, 1)[0], [selected]);
  const category = affirmation ? getDisplayInfo(affirmation.categoryId) : undefined;
  const [said, setSaid] = useState(false);
  const [saved, setSaved] = useState(false);

  const onSaid = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    trackEvent('onboarding_affirmation_said');
    setSaid(true);
  };

  const onSave = async () => {
    if (!affirmation || saved) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await toggleFavorite(affirmation.id);
    trackEvent('affirmation_favorited', { categoryId: affirmation.categoryId });
    setSaved(true);
  };

  return (
    <View style={styles.page}>
      <View style={styles.center}>
        <Text style={styles.kicker}>Your first one</Text>
        <Text style={styles.title}>Say it out loud</Text>
        {affirmation ? (
          <View style={styles.card}>
            {category ? (
              <View style={styles.cardCat}>
                <CategoryIcon name={affirmation.categoryId} size={18} color={C.textSecondary} />
                <Text style={styles.cardCatText}>{category.name}</Text>
              </View>
            ) : null}
            <Text style={styles.cardText}>{affirmation.text}</Text>
            <Tap onPress={onSave} hitSlop={10} style={styles.saveRow} accessibilityRole="button" accessibilityLabel={saved ? 'Saved to favorites' : 'Save to favorites'}>
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? C.heart : C.textSecondary} />
              <Text style={styles.saveText}>{saved ? 'Saved to favorites' : 'Save it'}</Text>
            </Tap>
          </View>
        ) : null}
        {said ? (
          <Animated.View entering={FadeIn.duration(250)} style={styles.saidRow}>
            <Ionicons name="checkmark-circle" size={22} color={C.success} />
            <Text style={styles.saidText}>Day one done. Four more are waiting on Today.</Text>
          </Animated.View>
        ) : (
          <Text style={styles.hint}>Slowly, like you mean it. Then tap below.</Text>
        )}
      </View>
      {said ? <PrimaryButton label="Continue" onPress={onNext} /> : <PrimaryButton label="I said it" onPress={onSaid} />}
    </View>
  );
}

function Reminder({ onDone }: { onDone: (enabled: boolean, time: string) => void }) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const onChange = (_: DateTimePickerEvent, picked?: Date) => {
    if (picked) setDate(picked);
  };

  const enable = async () => {
    setBusy(true);
    const granted = await requestNotificationPermissions();
    setBusy(false);
    if (!granted) {
      setDenied(true);
      return;
    }
    await scheduleDailyReminder(date.getHours(), date.getMinutes());
    onDone(true, hhmm);
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.focusScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>When should we nudge you?</Text>
        <Text style={styles.body}>{"One gentle reminder a day with your first affirmation. It's how streaks start."}</Text>
        <View style={styles.timeCard}>
          <Text style={styles.timeLabel}>
            {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </Text>
          <DateTimePicker
            value={date}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChange}
            style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
          />
        </View>
        {denied ? (
          <Text style={styles.denied}>Notifications are off for SayBright. You can turn them on later in Settings.</Text>
        ) : null}
      </ScrollView>
      {denied ? (
        <PrimaryButton label="Continue" onPress={() => onDone(false, hhmm)} />
      ) : (
        <>
          <PrimaryButton label={busy ? 'One moment' : 'Remind me daily'} onPress={enable} disabled={busy} />
          <Tap onPress={() => onDone(false, hhmm)} style={styles.secondary} accessibilityRole="button">
            <Text style={styles.secondaryText}>Not now</Text>
          </Tap>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg0 },
  flex: { flex: 1 },
  safe: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: 22 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.borderStrong },
  dotOn: { width: 22, backgroundColor: C.accent },
  dotDone: { backgroundColor: C.accentLight },
  page: { flex: 1, paddingBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bigTitle: { fontFamily: FONTS.displayBold, fontSize: 38, color: C.text, marginTop: 8, textAlign: 'center' },
  title: { fontFamily: FONTS.displayBold, fontSize: 28, lineHeight: 34, color: C.text, textAlign: 'center' },
  kicker: { fontFamily: FONTS.bodyBold, fontSize: 13, letterSpacing: 1, color: C.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  body: { fontFamily: FONTS.bodyRegular, fontSize: 16, lineHeight: 23, color: C.textSecondary, textAlign: 'center', marginTop: 10, paddingHorizontal: 8 },
  hint: { fontFamily: FONTS.bodyRegular, fontSize: 15, color: C.textSecondary, textAlign: 'center', marginTop: 18 },
  focusScroll: { paddingTop: 16, paddingBottom: 16 },
  picker: { marginTop: 22 },
  card: {
    alignSelf: 'stretch',
    marginTop: 22,
    padding: 24,
    borderRadius: RADIUS.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderOnSky,
  },
  cardCat: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardCatText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: C.textSecondary },
  cardText: { fontFamily: FONTS.displayBold, fontSize: 26, lineHeight: 35, color: C.text },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, alignSelf: 'flex-start' },
  saveText: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: C.textSecondary },
  saidRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 12 },
  saidText: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: C.text, flexShrink: 1 },
  timeCard: {
    marginTop: 24,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
    backgroundColor: C.surfaceStrong,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  iosPicker: { height: 190, alignSelf: 'stretch' },
  timeLabel: { fontFamily: FONTS.displayBold, fontSize: 34, color: C.text, marginTop: 10 },
  denied: { fontFamily: FONTS.bodyRegular, fontSize: 14, color: C.textSecondary, textAlign: 'center', marginTop: 14 },
  primary: { height: 56, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  primaryPressed: { opacity: 0.9 },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { fontFamily: FONTS.bodyBold, fontSize: 17, color: C.onAccent },
  secondary: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20, marginTop: 4 },
  secondaryText: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: C.textSecondary },
});
