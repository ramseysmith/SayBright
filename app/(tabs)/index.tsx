import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Affirmation, AFFIRMATIONS } from '../../src/data/affirmations';
import {
  getUserData,
  incrementSwipeCount,
  toggleFavorite,
} from '../../src/services/storage';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../src/constants/theme';
import {
  getAffirmationsByCategories,
  getCategoryById,
  shuffle,
} from '../../src/utils/affirmations';
import { getTimeOfDay } from '../../src/utils/time';
import { usePremium } from '../../src/context/PremiumContext';
import { preloadInterstitial, showInterstitial } from '../../src/services/ads';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FREE_DAILY_SWIPES = 5;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.22;

export default function TodayScreen() {
  const [pool, setPool] = useState<Affirmation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [sessionSwipes, setSessionSwipes] = useState(0);
  const [paywall, setPaywall] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isPremium } = usePremium();
  const router = useRouter();

  const { period, gradient } = useMemo(() => getTimeOfDay(), []);
  const textColor = gradient.textColor;
  const subtleTextColor =
    gradient.statusBar === 'light'
      ? 'rgba(255, 255, 255, 0.85)'
      : 'rgba(26, 26, 46, 0.7)';

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const animating = useRef(false);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getUserData();
      const selected = data.preferences.selectedCategories;
      const candidates = getAffirmationsByCategories(selected);
      const shuffled = shuffle(candidates.length > 0 ? candidates : AFFIRMATIONS);
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const swipes =
        data.dailyUsage.date === todayKey ? data.dailyUsage.todaySwipeCount : 0;
      if (!active) return;
      setPool(shuffled);
      setFavorites(data.favorites);
      setSwipeCount(swipes);
      setLoading(false);
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      scale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
    })();
    return () => {
      active = false;
    };
  }, [opacity, scale]);

  useEffect(() => {
    if (!isPremium) {
      preloadInterstitial();
    }
  }, [isPremium]);

  const lightHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const mediumHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const onAdvance = (direction: 'forward' | 'backward') => {
    if (direction === 'forward') {
      if (paywall) return;
      if (!isPremium && swipeCount >= FREE_DAILY_SWIPES) {
        setPaywall(true);
        return;
      }
      setCurrentIndex((i) => (pool.length === 0 ? 0 : (i + 1) % pool.length));
      incrementSwipeCount().then((next) => setSwipeCount(next));
      if (!isPremium) {
        setSessionSwipes((s) => {
          const next = s + 1;
          if (next > 0 && next % 3 === 0) {
            showInterstitial();
          }
          return next;
        });
      }
    } else {
      if (paywall) {
        setPaywall(false);
        return;
      }
      setCurrentIndex((i) =>
        pool.length === 0 ? 0 : (i - 1 + pool.length) % pool.length
      );
    }
  };

  const runTransition = (direction: 'forward' | 'backward') => {
    'worklet';
    const exitTo = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    const enterFrom = direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    translateX.value = withTiming(
      exitTo,
      { duration: 180, easing: Easing.in(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(onAdvance)(direction);
          translateX.value = enterFrom;
          translateX.value = withTiming(0, {
            duration: 220,
            easing: Easing.out(Easing.quad),
          });
        }
      }
    );
  };

  const startTransition = (direction: 'forward' | 'backward') => {
    if (animating.current) return;
    animating.current = true;
    lightHaptic();
    runTransition(direction);
    setTimeout(() => {
      animating.current = false;
    }, 450);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      const dist = Math.min(Math.abs(e.translationX) / SCREEN_WIDTH, 0.4);
      opacity.value = 1 - dist;
    })
    .onEnd((e) => {
      opacity.value = withTiming(1, { duration: 150 });
      if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(startTransition)('forward');
      } else if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(startTransition)('backward');
      } else {
        translateX.value = withSpring(0, { damping: 18 });
      }
    });

  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const current = pool[currentIndex];
  const isFavorited = current ? favorites.includes(current.id) : false;
  const category = current ? getCategoryById(current.categoryId) : undefined;

  const onToggleFavorite = async () => {
    if (!current || paywall) return;
    mediumHaptic();
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    const updated = await toggleFavorite(current.id);
    setFavorites(updated);
  };

  const indicatorText =
    pool.length > 0 && !paywall
      ? `${currentIndex + 1} of ${pool.length}`
      : '';

  return (
    <View style={styles.root}>
      <StatusBar style={gradient.statusBar} />
      <LinearGradient
        colors={gradient.colors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
      />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.header}>
          {!isPremium ? (
            <Pressable
              onPress={() => router.push('/paywall')}
              style={styles.goPremiumPill}
            >
              <Text style={styles.goPremiumText}>✨ Go Premium</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <View style={styles.streakBadge}>
            <Text style={[styles.streakText, { color: textColor }]}>🔥 0</Text>
          </View>
        </View>

        <View style={styles.cardWrapper}>
          {loading ? (
            <ActivityIndicator color={textColor} />
          ) : (
            <GestureDetector gesture={pan}>
              <Animated.View style={[styles.card, cardStyle]}>
                {paywall ? (
                  <PaywallCard
                    textColor={textColor}
                    subtleTextColor={subtleTextColor}
                    onSeePlans={() => router.push('/paywall')}
                  />
                ) : current ? (
                  <>
                    {category ? (
                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryEmoji}>{category.icon}</Text>
                        <Text
                          style={[styles.categoryName, { color: subtleTextColor }]}
                        >
                          {category.name}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={[styles.affirmation, { color: textColor }]}>
                      {current.text}
                    </Text>
                    <View style={styles.actionsRow}>
                      <Pressable hitSlop={12} onPress={onToggleFavorite}>
                        <Animated.View style={heartStyle}>
                          <Ionicons
                            name={isFavorited ? 'heart' : 'heart-outline'}
                            size={26}
                            color={isFavorited ? COLORS.warmCoral : textColor}
                          />
                        </Animated.View>
                      </Pressable>
                      <Pressable hitSlop={12}>
                        <Ionicons
                          name="share-outline"
                          size={26}
                          color={textColor}
                        />
                      </Pressable>
                    </View>
                  </>
                ) : null}
              </Animated.View>
            </GestureDetector>
          )}

          {indicatorText ? (
            <Text style={[styles.indicator, { color: subtleTextColor }]}>
              {indicatorText}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

function PaywallCard({
  textColor,
  subtleTextColor,
  onSeePlans,
}: {
  textColor: string;
  subtleTextColor: string;
  onSeePlans: () => void;
}) {
  return (
    <View style={styles.paywallInner}>
      <Text style={[styles.paywallTitle, { color: textColor }]}>
        You have seen today's free affirmations.
      </Text>
      <Text style={[styles.paywallBody, { color: subtleTextColor }]}>
        Unlock unlimited with SayBright Premium.
      </Text>
      <Pressable
        onPress={onSeePlans}
        style={[styles.paywallCta, { borderColor: textColor }]}
      >
        <Text style={[styles.paywallCtaText, { color: textColor }]}>
          See Plans
        </Text>
      </Pressable>
      <Text style={[styles.paywallFooter, { color: subtleTextColor }]}>
        Come back tomorrow for 5 more.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  goPremiumPill: {
    backgroundColor: COLORS.primaryGold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  goPremiumText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.white,
  },
  streakBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
  },
  streakText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: SPACING.xl,
    minHeight: 320,
    justifyContent: 'space-between',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  categoryEmoji: { fontSize: 18, marginRight: SPACING.sm },
  categoryName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
  },
  affirmation: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.affirmation,
    lineHeight: FONT_SIZES.affirmation * 1.3,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
  },
  indicator: {
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.caption,
  },
  paywallInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  paywallBody: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.body,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  paywallCta: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  paywallCtaText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
  },
  paywallFooter: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.caption,
    marginTop: SPACING.lg,
  },
});
