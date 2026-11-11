import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
import { Audio } from 'expo-av';
import { Affirmation, AFFIRMATIONS } from '../../src/data/affirmations';
import { getUserData, incrementSwipeCount, toggleFavorite } from '../../src/services/storage';
import { FONTS } from '../../src/constants/theme';
import { C, MAX_CONTENT_WIDTH, RADIUS, SKIES, dayPeriod } from '../../src/theme/colors';
import {
  getAffirmationsByCategories,
  getDailyAffirmations,
  getDisplayInfo,
  getTodayKey,
  shuffle,
} from '../../src/utils/affirmations';
import { greetingFor } from '../../src/utils/time';
import { usePremium } from '../../src/context/PremiumContext';
import { maybeShowInterstitial, preloadInterstitial } from '../../src/services/ads';
import { recordCoreActionFinished } from '../../src/lib/ad-policy';
import { FREE_DAILY_LIMIT } from '../../src/lib/free-tier';
import { checkInToday } from '../../src/services/streak';
import { maybeRequestReview } from '../../src/services/review';
import { MilestoneCelebration } from '../../src/components/MilestoneCelebration';
import { StreakCalendar } from '../../src/components/StreakCalendar';
import { useShare } from '../../src/context/ShareContext';
import { useToast } from '../../src/components/Toast';
import { updateWidgetData } from '../../src/services/widgetData';
import { trackEvent } from '../../src/services/analytics';
import { deleteRecording, getRecordingUri, hasRecording, playRecording } from '../../src/services/audio';
import { RecordingModal } from '../../src/components/RecordingModal';
import Tap from '../../src/components/Tap';
import SunriseHero from '../../src/components/art/SunriseHero';
import CategoryIcon from '../../src/components/art/CategoryIcon';
import BrightMark from '../../src/components/art/BrightMark';
import BillingIssueBanner from '../../src/components/BillingIssueBanner';
import { scheduleStreakNudge } from '../../src/services/notifications';
import { getActivePack, type SeasonalPack } from '../../src/data/seasonal';

export default function TodayScreen() {
  const [pool, setPool] = useState<Affirmation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [streakCount, setStreakCount] = useState(0);
  const [milestone, setMilestone] = useState<number | null>(null);
  // A streak that reset today after one missed day: the streak save offer (1.4.0)
  const [lapsed, setLapsed] = useState<number | null>(null);
  const [lapsedDismissed, setLapsedDismissed] = useState(false);
  const seasonalPack = useMemo(() => getActivePack(), []);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [recordingModalOpen, setRecordingModalOpen] = useState(false);
  const [recordedIds, setRecordedIds] = useState<Set<string>>(new Set());
  const playbackRef = useRef<Audio.Sound | null>(null);
  const { isPremium } = usePremium();
  const router = useRouter();
  const toast = useToast();
  const { shareAffirmation } = useShare();

  const period = useMemo(() => dayPeriod(), []);
  const sky = SKIES[period];
  const textColor = sky.ink;
  const subtleTextColor = sky.inkSecondary;
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const contentWidth = Math.min(winWidth, MAX_CONTENT_WIDTH);
  const swipeThreshold = contentWidth * 0.22;
  const finishedRecorded = useRef(false);
  const [reminderLabel, setReminderLabel] = useState<string | null>(null);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const animating = useRef(false);
  const streakBadgeScale = useSharedValue(1);
  const streakBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakBadgeScale.value }],
  }));

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
      const fullShuffled = shuffle(
        baseCandidates.length > 0 ? baseCandidates : AFFIRMATIONS
      );

      // Free users get five affirmations a day (1.3.0), picked from the date so
      // the first one matches the one their reminder notification carries.
      const resolvedPool: Affirmation[] = isPremium
        ? fullShuffled
        : getDailyAffirmations(getTodayKey(), selected, FREE_DAILY_LIMIT);

      if (!active) return;
      setPool(resolvedPool);
      setCurrentIndex(0);
      setFavorites(data.favorites);
      if (data.preferences.reminderEnabled) {
        const [hh, mm] = data.preferences.reminderTime.split(':').map(Number);
        const d = new Date();
        d.setHours(hh || 8, mm || 0, 0, 0);
        setReminderLabel(d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }));
      }
      setLoading(false);
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      scale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });

      const streakResult = await checkInToday(isPremium);
      if (!active) return;
      setStreakCount(streakResult.current);
      setLapsed(streakResult.lapsed);
      // Moves the 8 PM nudge to tomorrow, so it only arrives on a missed day
      scheduleStreakNudge(streakResult.current);
      if (streakResult.saved) {
        trackEvent('streak_saved', { current: streakResult.current });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        streakBadgeScale.value = withSequence(withSpring(1.4, { damping: 6, stiffness: 200 }), withSpring(1, { damping: 12, stiffness: 200 }));
        toast.show(`Streak saved. Day ${streakResult.current}.`);
      } else if (streakResult.lapsed && streakResult.isNewDay) {
        trackEvent('streak_save_offer', { kind: 'view', lost: streakResult.lapsed });
      }
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
    // toast is left out on purpose: a new toast object must not reload the day's set
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const exitTo = direction === 'forward' ? -contentWidth : contentWidth;
    const enterFrom = direction === 'forward' ? contentWidth : -contentWidth;
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
      const dist = Math.min(Math.abs(e.translationX) / contentWidth, 0.4);
      opacity.value = 1 - dist;
    })
    .onEnd((e) => {
      opacity.value = withTiming(1, { duration: 150 });
      if (e.translationX < -swipeThreshold) {
        runOnJS(startTransition)('forward');
      } else if (e.translationX > swipeThreshold) {
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
      router.push('/paywall?source=record_voice');
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
        toast.show('Playback failed. Please try again.');
      }
    } else {
      setRecordingModalOpen(true);
    }
  };

  const onMicLongPress = () => {
    if (!current || !isPremium || !hasOwnRecording) return;
    const target = current;
    const clearRecording = async () => {
      await stopPlayback();
      await deleteRecording(target.id);
      setRecordedIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
    };
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Your recording',
        options: ['Play', 'Record again', 'Delete', 'Cancel'],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
      },
      async (index) => {
        if (index === 0) onMicPress();
        if (index === 1) {
          await clearRecording();
          setRecordingModalOpen(true);
        }
        if (index === 2) await clearRecording();
      }
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

  // Finishing the day's five is the success moment. A full screen ad may
  // follow it only from the second finished set on, at most once a session
  // (src/lib/ad-policy.ts); the end card then offers Premium.
  useEffect(() => {
    if (!isPaywallCard || finishedRecorded.current) return;
    finishedRecorded.current = true;
    trackEvent('daily_set_finished', { kind: 'free' });
    (async () => {
      await new Promise((r) => setTimeout(r, 700));
      await maybeShowInterstitial(false);
      await recordCoreActionFinished();
    })();
  }, [isPaywallCard]);

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


  const onSky = sky.statusBar === 'light';
  const cardStyleStatic = onSky ? styles.cardNight : styles.cardDay;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const remaining = Math.max(0, pool.length - currentIndex);

  return (
    <View style={styles.root}>
      <StatusBar style={sky.statusBar} />
      <LinearGradient colors={sky.colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={[styles.column, { width: contentWidth }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.greeting, { color: textColor }]}>{greetingFor(period)}</Text>
              <Text style={[styles.date, { color: subtleTextColor }]}>{dateLabel}</Text>
            </View>
            <Tap
              onPress={() => setCalendarOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${streakCount} day streak, open calendar`}
            >
              <Animated.View style={[styles.streakChip, onSky ? styles.chipNight : styles.chipDay, streakBadgeStyle]}>
                <Ionicons name="flame" size={16} color={C.goldDeep} />
                <Text style={[styles.streakText, { color: textColor }]}>{streakCount}</Text>
              </Animated.View>
            </Tap>
          </View>

          <BillingIssueBanner />

          {lapsed && !lapsedDismissed && !isPremium ? (
            <View style={[styles.lapsed, onSky ? styles.chipNight : styles.chipDay]}>
              <View style={styles.lapsedIcon}>
                <Ionicons name="flame" size={18} color={C.onGold} />
              </View>
              <View style={styles.lapsedText}>
                <Text style={[styles.lapsedTitle, { color: textColor }]}>{`Your ${lapsed} day streak slipped`}</Text>
                <Text style={[styles.lapsedBody, { color: subtleTextColor }]}>Premium saves a missed day once a week. Start today and it comes back.</Text>
                <View style={styles.lapsedActions}>
                  <Tap
                    onPress={() => {
                      trackEvent('streak_save_offer', { kind: 'tap', lost: lapsed });
                      router.push('/paywall?source=streak_save');
                    }}
                    style={styles.lapsedCta}
                    pressedStyle={styles.endCtaPressed}
                    accessibilityRole="button"
                  >
                    <Text style={styles.lapsedCtaText}>Save my streak</Text>
                  </Tap>
                  <Tap onPress={() => setLapsedDismissed(true)} hitSlop={10} style={styles.lapsedLater} accessibilityRole="button">
                    <Text style={[styles.lapsedLaterText, { color: subtleTextColor }]}>Start over</Text>
                  </Tap>
                </View>
              </View>
            </View>
          ) : null}

          <View style={[styles.hero, lapsed && !lapsedDismissed && !isPremium ? styles.heroHidden : null, { width: winWidth, marginLeft: -(winWidth - contentWidth) / 2 - 20 }]} pointerEvents="none">
            <SunriseHero width={winWidth} period={period} height={Math.min(240, Math.max(140, winHeight * 0.22))} />
          </View>

          <View style={styles.cardWrapper}>
            {loading ? (
              <ActivityIndicator color={textColor} />
            ) : (
              <GestureDetector gesture={pan}>
                <Animated.View style={[styles.card, cardStyleStatic, cardStyle]}>
                  {isPaywallCard ? (
                    <EndOfDayCard
                      reminderTime={reminderLabel}
                      textColor={textColor}
                      subtleTextColor={subtleTextColor}
                      onSeePlans={() => router.push('/paywall?source=daily_limit')}
                      pack={seasonalPack}
                      onOpenPack={() => {
                        if (!seasonalPack) return;
                        trackEvent('seasonal_opened', { source: 'end_card' });
                        router.push({ pathname: '/category/[id]', params: { id: seasonalPack.id } });
                      }}
                    />
                  ) : current ? (
                    <>
                      {category ? (
                        <View style={styles.categoryRow}>
                          <CategoryIcon name={current.categoryId} size={18} color={subtleTextColor} />
                          <Text style={[styles.categoryName, { color: subtleTextColor }]}>{category.name}</Text>
                        </View>
                      ) : null}
                      <Text
                        style={[styles.affirmation, { color: textColor }]}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        numberOfLines={6}
                      >
                        {current.text}
                      </Text>
                      <View style={styles.actionsRow}>
                        <Tap hitSlop={12} onPress={onToggleFavorite} accessibilityRole="button" accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Save to favorites'}>
                          <Animated.View style={heartStyle}>
                            <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={26} color={isFavorited ? C.heart : textColor} />
                          </Animated.View>
                        </Tap>
                        <Tap
                          hitSlop={12}
                          onPress={onMicPress}
                          onLongPress={onMicLongPress}
                          accessibilityRole="button"
                          accessibilityLabel={hasOwnRecording ? 'Play your recording' : 'Record in your voice'}
                        >
                          <View>
                            <Ionicons name={hasOwnRecording ? 'mic' : 'mic-outline'} size={26} color={hasOwnRecording ? C.goldDeep : textColor} />
                            {!isPremium ? (
                              <View style={styles.micLockBadge}>
                                <Ionicons name="lock-closed" size={9} color={C.onGold} />
                              </View>
                            ) : null}
                          </View>
                        </Tap>
                        <Tap hitSlop={12} onPress={() => current && shareAffirmation(current)} accessibilityRole="button" accessibilityLabel="Share">
                          <Ionicons name="share-outline" size={26} color={textColor} />
                        </Tap>
                      </View>
                    </>
                  ) : null}
                </Animated.View>
              </GestureDetector>
            )}

            {!loading && !isPremium && pool.length > 0 ? (
              <View style={styles.progressRow} accessibilityLabel={`${Math.min(currentIndex + 1, pool.length)} of ${pool.length} today`}>
                {pool.map((a, i) => (
                  <View
                    key={a.id}
                    style={[styles.progressDot, { backgroundColor: i <= currentIndex ? textColor : subtleTextColor }, i <= currentIndex ? null : styles.progressDotOff]}
                  />
                ))}
                <Text style={[styles.progressText, { color: subtleTextColor }]}>
                  {isPaywallCard ? 'All five said' : remaining <= 1 ? 'Last one today' : `${remaining - 1} more today`}
                </Text>
              </View>
            ) : !loading && isPremium ? (
              <Text style={[styles.progressText, styles.swipeHint, { color: subtleTextColor }]}>Swipe for the next one</Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <MilestoneCelebration visible={milestone !== null} milestone={milestone} onClose={() => setMilestone(null)} />
      <StreakCalendar visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
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

/** Closes the free daily set: the Premium entry is part of the layout. */
function EndOfDayCard({
  reminderTime,
  textColor,
  subtleTextColor,
  onSeePlans,
  pack,
  onOpenPack,
}: {
  pack?: SeasonalPack;
  onOpenPack: () => void;
  reminderTime: string | null;
  textColor: string;
  subtleTextColor: string;
  onSeePlans: () => void;
}) {
  return (
    <View style={styles.endInner}>
      <BrightMark size={84} />
      <Text style={[styles.endTitle, { color: textColor }]}>{"That's your five for today"}</Text>
      <Text style={[styles.endBody, { color: subtleTextColor }]}>
        {reminderTime ? `Five new ones tomorrow at ${reminderTime}.` : 'Five new ones arrive tomorrow.'} Or keep going now with every
        category and no limit.
      </Text>
      <Tap onPress={onSeePlans} style={styles.endCta} pressedStyle={styles.endCtaPressed} accessibilityRole="button">
        <Ionicons name="sparkles" size={16} color={C.onGold} />
        <Text style={styles.endCtaText}>Keep going with Premium</Text>
      </Tap>
      {pack ? (
        <Tap onPress={onOpenPack} hitSlop={8} style={styles.endPack} accessibilityRole="button" accessibilityLabel={`${pack.name}, ${pack.texts.length} more this month, free`}>
          <Text style={[styles.endPackText, { color: textColor }]}>{`Read ${pack.name}, free`}</Text>
          <Ionicons name="chevron-forward" size={16} color={textColor} />
        </Tap>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, alignItems: 'center' },
  column: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  headerText: { flex: 1, paddingRight: 12 },
  greeting: { fontFamily: FONTS.displayBold, fontSize: 26 },
  date: { fontFamily: FONTS.bodyMedium, fontSize: 14, marginTop: 2 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipDay: { backgroundColor: C.surface, borderColor: C.borderOnSky },
  chipNight: { backgroundColor: C.surfaceOnSky, borderColor: C.surfaceOnSkyStrong },
  streakText: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  hero: { alignItems: 'center', marginTop: 2 },
  cardWrapper: { flex: 1, justifyContent: 'flex-start', paddingTop: 20, paddingBottom: 12 },
  card: { borderRadius: RADIUS.lg, padding: 26, minHeight: 300, justifyContent: 'space-between', borderWidth: 1 },
  cardDay: {
    backgroundColor: C.surface,
    borderColor: C.borderOnSky,
    shadowColor: C.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  cardNight: { backgroundColor: C.surfaceOnDusk, borderColor: C.surfaceOnSkyStrong },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  categoryName: { fontFamily: FONTS.bodyMedium, fontSize: 14 },
  affirmation: { fontFamily: FONTS.displayBold, fontSize: 27, lineHeight: 36 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, paddingHorizontal: 4 },
  micLockBadge: {
    position: 'absolute',
    bottom: -3,
    right: -5,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, gap: 6 },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  progressDotOff: { opacity: 0.35 },
  progressText: { fontFamily: FONTS.bodyMedium, fontSize: 13, marginLeft: 6 },
  swipeHint: { textAlign: 'center', marginTop: 18, marginLeft: 0 },
  endInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  endTitle: { fontFamily: FONTS.displayBold, fontSize: 24, textAlign: 'center', marginTop: 6 },
  endBody: { fontFamily: FONTS.bodyRegular, fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  endCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 22,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.gold,
  },
  endPack: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, marginTop: 6 },
  endPackText: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  heroHidden: { display: 'none' },
  lapsed: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, marginTop: 14 },
  lapsedIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  lapsedText: { flex: 1 },
  lapsedTitle: { fontFamily: FONTS.bodyBold, fontSize: 16 },
  lapsedBody: { fontFamily: FONTS.bodyRegular, fontSize: 14, lineHeight: 20, marginTop: 2 },
  lapsedActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  lapsedCta: { height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  lapsedCtaText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: C.onGold },
  lapsedLater: { minHeight: 44, justifyContent: 'center' },
  lapsedLaterText: { fontFamily: FONTS.bodyMedium, fontSize: 14 },
  endCtaPressed: { backgroundColor: C.goldDeep },
  endCtaText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: C.onGold },
});
