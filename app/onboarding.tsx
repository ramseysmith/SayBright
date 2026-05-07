import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../src/constants/theme';
import { TIME_GRADIENTS } from '../src/utils/time';
import { CategoryPicker } from '../src/components/CategoryPicker';
import {
  setHasSeenOnboarding,
  setSelectedCategories,
  updateUserData,
} from '../src/services/storage';
import { trackEvent } from '../src/services/analytics';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  getRandomNotificationAffirmation,
} from '../src/services/notifications';
import { getAffirmationsByCategories } from '../src/utils/affirmations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  gradient: readonly [string, string, string];
  textColor: string;
  statusBar: 'dark' | 'light';
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    emoji: '☀️',
    title: 'Welcome to SayBright',
    subtitle: 'Speak your brightest self into existence.',
    gradient: TIME_GRADIENTS.morning.colors,
    textColor: TIME_GRADIENTS.morning.textColor,
    statusBar: TIME_GRADIENTS.morning.statusBar,
  },
  {
    key: 'ritual',
    emoji: '✨',
    title: 'Your Daily Ritual',
    subtitle:
      'Swipe through affirmations chosen just for you. Save your favorites and share them with the world.',
    gradient: TIME_GRADIENTS.afternoon.colors,
    textColor: TIME_GRADIENTS.afternoon.textColor,
    statusBar: TIME_GRADIENTS.afternoon.statusBar,
  },
  {
    key: 'consistent',
    emoji: '🔥',
    title: 'Stay Consistent',
    subtitle:
      'Build a daily streak and watch your mindset transform over time.',
    gradient: TIME_GRADIENTS.evening.colors,
    textColor: TIME_GRADIENTS.evening.textColor,
    statusBar: TIME_GRADIENTS.evening.statusBar,
  },
];

const REMINDER_GRADIENT: readonly [string, string, string] = [
  '#B8A9E8',
  '#E8E0F5',
  '#FFF8F0',
];

type PageItem = Slide | { key: 'focus' } | { key: 'reminder' };

export default function OnboardingScreen() {
  const listRef = useRef<FlatList<PageItem>>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([
    'confidence',
    'gratitude',
  ]);
  const router = useRouter();

  const pages: PageItem[] = [...SLIDES, { key: 'focus' }, { key: 'reminder' }];
  const totalPages = pages.length;
  const currentPage = pages[pageIndex];
  const isFocus = currentPage?.key === 'focus';
  const isReminder = currentPage?.key === 'reminder';
  const canProceedFocus = selected.length >= 2 && selected.length <= 4;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== pageIndex) setPageIndex(next);
  };

  const finishOnboarding = async (
    reminderEnabled: boolean,
    reminderTime: string
  ) => {
    await setSelectedCategories(selected);
    await updateUserData((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        reminderEnabled,
        reminderTime,
      },
    }));
    await setHasSeenOnboarding(true);
    trackEvent('onboarding_complete', {
      categoriesSelected: selected.length,
      remindersEnabled: reminderEnabled,
    });
    router.replace('/(tabs)');
  };

  const handleNext = async () => {
    Haptics.selectionAsync();
    if (isReminder) return; // reminder slide handles its own actions
    if (isFocus && !canProceedFocus) return;
    const target = pageIndex + 1;
    listRef.current?.scrollToIndex({ index: target, animated: true });
  };

  const currentStatusBar: 'light' | 'dark' = isFocus
    ? 'dark'
    : isReminder
      ? 'dark'
      : SLIDES[pageIndex]?.statusBar ?? 'dark';

  const ctaLabel = 'Next';
  const ctaDisabled = isFocus && !canProceedFocus;

  return (
    <View style={styles.root}>
      <StatusBar style={currentStatusBar} />
      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!isReminder /* lock during reminder confirmation */ || true}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          if (item.key === 'focus') {
            return (
              <FocusSlide
                selected={selected}
                onChange={setSelected}
                onPremiumTap={() => router.push('/paywall')}
              />
            );
          }
          if (item.key === 'reminder') {
            return (
              <ReminderSlide
                selectedCategories={selected}
                onComplete={finishOnboarding}
              />
            );
          }
          return <IntroSlide slide={item as Slide} />;
        }}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
      {!isReminder ? (
        <SafeAreaView edges={['bottom']} style={styles.footer} pointerEvents="box-none">
          <View style={styles.dots}>
            {pages.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === pageIndex
                        ? COLORS.textPrimary
                        : 'rgba(26, 26, 46, 0.25)',
                  },
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={handleNext}
            disabled={ctaDisabled}
            style={[
              styles.cta,
              { backgroundColor: COLORS.textPrimary },
              ctaDisabled && { opacity: 0.4 },
            ]}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </Pressable>
        </SafeAreaView>
      ) : (
        <SafeAreaView
          edges={['bottom']}
          style={styles.dotsOnlyFooter}
          pointerEvents="none"
        >
          <View style={styles.dots}>
            {pages.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === pageIndex
                        ? COLORS.textPrimary
                        : 'rgba(26, 26, 46, 0.25)',
                  },
                ]}
              />
            ))}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

function IntroSlide({ slide }: { slide: Slide }) {
  return (
    <View style={styles.slide}>
      <LinearGradient
        colors={slide.gradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView edges={['top']} style={styles.slideInner}>
        <View style={styles.slideContent}>
          <Text style={styles.heroEmoji}>{slide.emoji}</Text>
          <Text style={[styles.title, { color: slide.textColor }]}>
            {slide.title}
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color:
                  slide.textColor === COLORS.white
                    ? 'rgba(255, 255, 255, 0.85)'
                    : 'rgba(26, 26, 46, 0.7)',
              },
            ]}
          >
            {slide.subtitle}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FocusSlide({
  selected,
  onChange,
  onPremiumTap,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  onPremiumTap: () => void;
}) {
  return (
    <View style={[styles.slide, { backgroundColor: COLORS.cream }]}>
      <SafeAreaView edges={['top']} style={styles.slideInner}>
        <ScrollView
          contentContainerStyle={styles.focusContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, styles.titleSmaller, { color: COLORS.textPrimary }]}>
            Choose Your Focus
          </Text>
          <Text
            style={[
              styles.subtitle,
              styles.subtitleSmaller,
              { color: COLORS.textSecondary },
            ]}
          >
            Pick 2 to 4 categories to get started.
          </Text>
          <View style={styles.pickerWrap}>
            <CategoryPicker
              selectedIds={selected}
              onChange={onChange}
              isPremium={false}
              maxSelections={4}
              onLockedTap={onPremiumTap}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type ReminderPhase = 'idle' | 'requesting' | 'denied' | 'success';

function ReminderSlide({
  selectedCategories,
  onComplete,
}: {
  selectedCategories: string[];
  onComplete: (enabled: boolean, time: string) => Promise<void>;
}) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [phase, setPhase] = useState<ReminderPhase>('idle');

  const formatTime = (d: Date): string => {
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
    const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
    return `${h12}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
  };

  const formatHHMM = (d: Date): string =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const onTimeChange = (_: DateTimePickerEvent, picked?: Date) => {
    if (picked) setDate(picked);
  };

  const handleEnable = async () => {
    Haptics.selectionAsync();
    setPhase('requesting');
    const granted = await requestNotificationPermissions();
    if (!granted) {
      setPhase('denied');
      return;
    }
    const pool = getAffirmationsByCategories(selectedCategories);
    const text = getRandomNotificationAffirmation(pool);
    await scheduleDailyReminder(date.getHours(), date.getMinutes(), text);
    setPhase('success');
    setTimeout(() => {
      onComplete(true, formatHHMM(date));
    }, 1500);
  };

  const handleSkip = async () => {
    Haptics.selectionAsync();
    await onComplete(false, formatHHMM(date));
  };

  const handleContinueWithout = async () => {
    await onComplete(false, formatHHMM(date));
  };

  return (
    <View style={styles.slide}>
      <LinearGradient
        colors={REMINDER_GRADIENT}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView edges={['top', 'bottom']} style={styles.slideInner}>
        <ScrollView
          contentContainerStyle={styles.reminderContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heroEmoji}>🔔</Text>
          <Text style={[styles.title, styles.reminderTitle]}>
            Never Miss Your Affirmation
          </Text>
          <Text style={styles.reminderSubtitle}>
            Pick a time each day and we'll send you a gentle reminder with a
            fresh affirmation.
          </Text>

          <View style={styles.pickerCard}>
            <Text style={styles.pickerCardLabel}>Reminder time</Text>
            <Text style={styles.pickerCardTime}>{formatTime(date)}</Text>
            <DateTimePicker
              value={date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
            />
          </View>

          {phase === 'success' ? (
            <View style={styles.successBox}>
              <Ionicons
                name="checkmark-circle"
                size={32}
                color={COLORS.successGreen}
              />
              <Text style={styles.successText}>You're all set!</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleEnable}
              disabled={phase === 'requesting'}
              style={[
                styles.enableBtn,
                phase === 'requesting' && { opacity: 0.7 },
              ]}
            >
              {phase === 'requesting' ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.enableBtnText}>Enable Reminders</Text>
              )}
            </Pressable>
          )}

          {phase === 'denied' ? (
            <>
              <Text style={styles.deniedNote}>
                No worries, you can always enable reminders later in Settings.
              </Text>
              <Pressable
                onPress={handleContinueWithout}
                style={styles.skipBtn}
              >
                <Text style={styles.skipBtnText}>Continue Without Reminders</Text>
              </Pressable>
            </>
          ) : phase === 'idle' ? (
            <Pressable onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>Skip for Now</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  slide: { width: SCREEN_WIDTH, flex: 1 },
  slideInner: { flex: 1 },
  slideContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 72,
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  titleSmaller: {
    fontSize: 28,
    marginTop: SPACING.lg,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.subtitle,
    textAlign: 'center',
    lineHeight: 26,
  },
  subtitleSmaller: {
    fontSize: FONT_SIZES.body,
    marginBottom: SPACING.lg,
  },
  focusContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 160,
  },
  pickerWrap: {
    marginTop: SPACING.md,
  },
  reminderContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl + 24,
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: 28,
    color: COLORS.textPrimary,
  },
  reminderSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.body,
    textAlign: 'center',
    color: 'rgba(26, 26, 46, 0.72)',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  pickerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    marginVertical: SPACING.md,
    width: '100%',
    alignItems: 'center',
  },
  pickerCardLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
  },
  pickerCardTime: {
    fontFamily: FONTS.displayBold,
    fontSize: 36,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  iosPicker: {
    height: 180,
    width: 240,
  },
  enableBtn: {
    backgroundColor: COLORS.primaryGold,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    width: '100%',
    marginTop: SPACING.md,
  },
  enableBtnText: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
    fontSize: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  successText: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.successGreen,
    fontSize: FONT_SIZES.body,
  },
  deniedNote: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: 'rgba(26, 26, 46, 0.72)',
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 20,
  },
  skipBtn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  skipBtnText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  dotsOnlyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: SPACING.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  cta: {
    paddingVertical: SPACING.md,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
    fontSize: FONT_SIZES.body,
  },
});
