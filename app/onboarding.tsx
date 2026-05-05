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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../src/constants/theme';
import { TIME_GRADIENTS } from '../src/utils/time';
import { CategoryPicker } from '../src/components/CategoryPicker';
import {
  setHasSeenOnboarding,
  setSelectedCategories,
} from '../src/services/storage';
import { trackEvent } from '../src/services/analytics';

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

export default function OnboardingScreen() {
  const listRef = useRef<FlatList<Slide | { key: 'focus' }>>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([
    'confidence',
    'gratitude',
  ]);
  const router = useRouter();

  const pages: (Slide | { key: 'focus' })[] = [...SLIDES, { key: 'focus' }];
  const totalPages = pages.length;
  const isFocus = pageIndex === totalPages - 1;
  const canProceedFocus = selected.length >= 2 && selected.length <= 4;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== pageIndex) setPageIndex(next);
  };

  const handleNext = async () => {
    Haptics.selectionAsync();
    if (!isFocus) {
      const target = pageIndex + 1;
      listRef.current?.scrollToIndex({ index: target, animated: true });
      return;
    }
    if (!canProceedFocus) return;
    await setSelectedCategories(selected);
    await setHasSeenOnboarding(true);
    trackEvent('onboarding_complete', {
      categoriesSelected: selected.length,
    });
    router.replace('/(tabs)');
  };

  const currentStatusBar =
    isFocus ? 'dark' : SLIDES[pageIndex]?.statusBar ?? 'dark';
  const ctaLabel = isFocus ? 'Get Started' : 'Next';
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
          return <IntroSlide slide={item as Slide} />;
        }}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
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
