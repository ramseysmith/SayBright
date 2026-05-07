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
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Affirmation, AFFIRMATIONS } from '../../src/data/affirmations';
// note: getDisplayInfo replaces getCategoryById for pack-aware lookups
import {
  getOrCreateDailyAffirmationIds,
  getUserData,
  incrementSwipeCount,
  toggleFavorite,
} from '../../src/services/storage';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../src/constants/theme';
import {
  getAffirmationsByCategories,
  shuffle,
} from '../../src/utils/affirmations';
import { getTimeOfDay } from '../../src/utils/time';
import { usePremium } from '../../src/context/PremiumContext';
import { preloadInterstitial, showInterstitial } from '../../src/services/ads';
import { checkInToday } from '../../src/services/streak';
import { maybeRequestReview } from '../../src/services/review';
import { MilestoneCelebration } from '../../src/components/MilestoneCelebration';
import { StreakCalendar } from '../../src/components/StreakCalendar';
import { useShare } from '../../src/context/ShareContext';
import { updateWidgetData } from '../../src/services/widgetData';
import { trackEvent } from '../../src/services/analytics';
import { getDisplayInfo } from '../../src/utils/affirmations';
import { getPurchasedPacks } from '../../src/services/purchases';
import { getPackByProductId } from '../../src/data/packs';
import {
  deleteRecording,
  getRecordingUri,
  hasRecording,
  playRecording,
} from '../../src/services/audio';
import { RecordingModal } from '../../src/components/RecordingModal';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FREE_DAILY_LIMIT = 5;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.22;

export default function TodayScreen() {
  const [pool, setPool] = useState<Affirmation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sessionSwipes, setSessionSwipes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streakCount, setStreakCount] = useState(0);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [recordingModalOpen, setRecordingModalOpen] = useState(false);
  const [recordedIds, setRecordedIds] = useState<Set<string>>(new Set());
  const playbackRef = useRef<Audio.Sound | null>(null);
  const { isPremium } = usePremium();
  const router = useRouter();
  const { shareAffirmation } = useShare();

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
  const streakBadgeScale = useSharedValue(1);
  const streakBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakBadgeScale.value }],
  }));
  const flameScale = useSharedValue(1);
  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  useEffect(() => {
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.15, {
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );
  }, [flameScale]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getUserData();
      const selected = data.preferences.selectedCategories;
      const baseCandidates = getAffirmationsByCategories(selected);

      const purchasedProductIds = await getPurchasedPacks();
      const packAffirmations: Affirmation[] = purchasedProductIds.flatMap(
        (productId) => {
          const pack = getPackByProductId(productId);
          if (!pack) return [];
          return pack.affirmations.map((a) => ({
            id: a.id,
            text: a.text,
            categoryId: pack.id,
            isPremium: false,
          }));
        }
      );

      const combined = [...baseCandidates, ...packAffirmations];
      const fullShuffled = shuffle(
        combined.length > 0 ? combined : AFFIRMATIONS
      );

      let resolvedPool: Affirmation[];
      if (isPremium) {
        resolvedPool = fullShuffled;
      } else {
        const lookup = new Map<string, Affirmation>();
        for (const a of [...AFFIRMATIONS, ...packAffirmations]) {
          lookup.set(a.id, a);
        }
        const dailyIds = await getOrCreateDailyAffirmationIds(() =>
          fullShuffled.slice(0, FREE_DAILY_LIMIT).map((a) => a.id)
        );
        const resolved = dailyIds
          .map((id) => lookup.get(id))
          .filter((a): a is Affirmation => Boolean(a));
        resolvedPool =
          resolved.length > 0
            ? resolved
            : fullShuffled.slice(0, FREE_DAILY_LIMIT);
      }

      if (!active) return;
      setPool(resolvedPool);
      setCurrentIndex(0);
      setFavorites(data.favorites);
      setLoading(false);
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      scale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });

      const streakResult = await checkInToday();
      if (!active) return;
      setStreakCount(streakResult.current);
      if (streakResult.isNewDay) {
        trackEvent('streak_incremented', { current: streakResult.current });
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
        streakBadgeScale.value = withSequence(
          withSpring(1.4, { damping: 6, stiffness: 200 }),
          withSpring(1, { damping: 12, stiffness: 200 })
        );
        if (streakResult.milestone) {
          trackEvent('streak_milestone', {
            milestone: streakResult.milestone,
          });
          setMilestone(streakResult.milestone);
        } else {
          setTimeout(() => {
            maybeRequestReview();
          }, 2000);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [opacity, scale, streakBadgeScale, isPremium]);

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

  const canSwipe = (direction: 'forward' | 'backward'): boolean => {
    if (pool.length === 0) return false;
    if (isPremium) return true;
    if (direction === 'forward') {
      // Free users can advance up to and including the paywall card.
      return currentIndex < pool.length;
    }
    return currentIndex > 0;
  };

  const onAdvance = (direction: 'forward' | 'backward') => {
    if (pool.length === 0) return;
    if (direction === 'forward') {
      if (isPremium) {
        setCurrentIndex((i) => (i + 1) % pool.length);
      } else {
        setCurrentIndex((i) => i + 1);
        incrementSwipeCount().catch(() => {});
        setSessionSwipes((s) => {
          const next = s + 1;
          if (next > 0 && next % 3 === 0) {
            showInterstitial();
          }
          return next;
        });
      }
    } else {
      if (isPremium) {
        setCurrentIndex((i) => (i - 1 + pool.length) % pool.length);
      } else {
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
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
    if (!canSwipe(direction)) {
      // Bounds hit: spring back without changing index.
      translateX.value = withSpring(0, { damping: 18 });
      return;
    }
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
  const category = current ? getDisplayInfo(current.categoryId) : undefined;
  const hasOwnRecording = current ? recordedIds.has(current.id) : false;

  useEffect(() => {
    if (current) {
      trackEvent('affirmation_viewed', {
        affirmationId: current.id,
        categoryId: current.categoryId,
      });
    }
  }, [current]);

  useEffect(() => {
    if (!current) return;
    let active = true;
    (async () => {
      const exists = await hasRecording(current.id);
      if (!active) return;
      setRecordedIds((prev) => {
        const next = new Set(prev);
        if (exists) next.add(current.id);
        else next.delete(current.id);
        return next;
      });
    })();
    return () => {
      active = false;
    };
  }, [current]);

  const stopPlayback = async () => {
    if (playbackRef.current) {
      try {
        await playbackRef.current.stopAsync();
        await playbackRef.current.unloadAsync();
      } catch {
        // ignore
      }
      playbackRef.current = null;
    }
  };

  const onMicPress = async () => {
    if (!current) return;
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    if (hasOwnRecording) {
      try {
        await stopPlayback();
        const uri = getRecordingUri(current.id);
        const sound = await playRecording(uri);
        playbackRef.current = sound;
        trackEvent('recording_played', { affirmationId: current.id });
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            if (playbackRef.current === sound) playbackRef.current = null;
          }
        });
      } catch {
        Alert.alert('Playback failed', 'Please try again.');
      }
    } else {
      setRecordingModalOpen(true);
    }
  };

  const onMicLongPress = () => {
    if (!current || !isPremium || !hasOwnRecording) return;
    Alert.alert(
      'Recording options',
      undefined,
      [
        {
          text: 'Play',
          onPress: () => onMicPress(),
        },
        {
          text: 'Re record',
          onPress: async () => {
            await stopPlayback();
            await deleteRecording(current.id);
            setRecordedIds((prev) => {
              const next = new Set(prev);
              next.delete(current.id);
              return next;
            });
            setRecordingModalOpen(true);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await stopPlayback();
            await deleteRecording(current.id);
            setRecordedIds((prev) => {
              const next = new Set(prev);
              next.delete(current.id);
              return next;
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  useEffect(() => {
    stopPlayback();
  }, [currentIndex]);

  useEffect(() => {
    if (!current) return;
    const display = getDisplayInfo(current.categoryId);
    updateWidgetData(
      {
        affirmationText: current.text,
        categoryEmoji: display?.icon ?? '☀️',
        categoryName: display?.name ?? 'SayBright',
        streakCount,
        lastUpdated: new Date().toISOString(),
      },
      isPremium
    );
  }, [current, streakCount, isPremium]);

  const isPaywallCard = !isPremium && pool.length > 0 && currentIndex >= pool.length;

  const onToggleFavorite = async () => {
    if (!current || isPaywallCard) return;
    mediumHaptic();
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    const updated = await toggleFavorite(current.id);
    setFavorites(updated);
    trackEvent('affirmation_favorited', {
      affirmationId: current.id,
      totalFavorites: updated.length,
    });
  };

  const indicatorText =
    pool.length > 0 && !isPaywallCard
      ? `${Math.min(currentIndex + 1, pool.length)} of ${pool.length}`
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
            <GoPremiumPill onPress={() => router.push('/paywall')} />
          ) : (
            <View />
          )}
          <Pressable onPress={() => setCalendarOpen(true)} hitSlop={6}>
            <Animated.View style={[styles.streakBadge, streakBadgeStyle]}>
              <Animated.Text
                style={[styles.streakText, styles.flameEmoji, { color: textColor }, flameStyle]}
              >
                🔥
              </Animated.Text>
              <Text style={[styles.streakText, { color: textColor }]}>
                {streakCount}
              </Text>
            </Animated.View>
          </Pressable>
        </View>

        <View style={styles.cardWrapper}>
          {loading ? (
            <ActivityIndicator color={textColor} />
          ) : (
            <GestureDetector gesture={pan}>
              <Animated.View style={[styles.card, cardStyle]}>
                {isPaywallCard ? (
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
                      <Pressable
                        hitSlop={12}
                        onPress={onMicPress}
                        onLongPress={onMicLongPress}
                      >
                        <View style={{ position: 'relative' }}>
                          <Ionicons
                            name={hasOwnRecording ? 'mic' : 'mic-outline'}
                            size={26}
                            color={
                              hasOwnRecording ? COLORS.primaryGold : textColor
                            }
                          />
                          {!isPremium ? (
                            <View style={styles.micLockBadge}>
                              <Ionicons
                                name="lock-closed"
                                size={10}
                                color={COLORS.white}
                              />
                            </View>
                          ) : null}
                        </View>
                      </Pressable>
                      <Pressable
                        hitSlop={12}
                        onPress={() => current && shareAffirmation(current)}
                      >
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

      <MilestoneCelebration
        visible={milestone !== null}
        milestone={milestone}
        onClose={() => setMilestone(null)}
      />
      <StreakCalendar
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
      />
      <RecordingModal
        visible={recordingModalOpen}
        affirmationId={current?.id ?? null}
        affirmationText={current?.text ?? ''}
        onClose={() => setRecordingModalOpen(false)}
        onSaved={() => {
          if (current) {
            setRecordedIds((prev) => new Set(prev).add(current.id));
            trackEvent('recording_created', { affirmationId: current.id });
          }
        }}
      />
    </View>
  );
}

function GoPremiumPill({ onPress }: { onPress: () => void }) {
  const shimmerX = useSharedValue(-80);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withSequence(
        withDelay(
          3000,
          withTiming(120, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        withTiming(-80, { duration: 0 })
      ),
      -1,
      false
    );
  }, [shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { rotate: '20deg' }],
  }));

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View style={styles.goPremiumPill}>
        <Text style={styles.goPremiumText}>✨ Go Premium</Text>
        <Animated.View
          pointerEvents="none"
          style={[styles.shimmerWrap, shimmerStyle]}
        >
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0)',
              'rgba(255, 255, 255, 0.45)',
              'rgba(255, 255, 255, 0)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      </View>
    </Pressable>
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
    backgroundColor: '#E8961F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  goPremiumText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: COLORS.white,
  },
  shimmerWrap: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 30,
    left: 0,
  },
  shimmerGradient: {
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
  },
  streakText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
  },
  flameEmoji: {
    marginRight: 4,
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
  micLockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
