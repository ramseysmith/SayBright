import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../src/constants/theme';
import { getTimeOfDay } from '../src/utils/time';
import { getUserData } from '../src/services/storage';

const SUBTITLES = [
  'Today is full of possibility.',
  'Your words shape your world.',
  'One affirmation can change your whole day.',
  'You showed up. That matters.',
  'Breathe in confidence. Breathe out doubt.',
  'Your mindset is your superpower.',
  'The best time to start is now.',
  'You are exactly where you need to be.',
  'Small steps lead to big transformations.',
  'Your potential is limitless.',
  'Every day is a fresh start.',
  'Believe in the power of your own voice.',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Welcome Back';
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { gradient } = useMemo(() => getTimeOfDay(), []);
  const greeting = useMemo(() => getGreeting(), []);
  const subtitle = useMemo(
    () => SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)],
    []
  );
  const [streakCount, setStreakCount] = useState(0);

  const isLightText = gradient.statusBar === 'light';
  const textColor = isLightText ? COLORS.white : COLORS.textPrimary;
  const subtleColor = isLightText
    ? 'rgba(255, 255, 255, 0.85)'
    : 'rgba(26, 26, 46, 0.7)';

  const sunY = useSharedValue(100);
  const sunOpacity = useSharedValue(0);
  const sunScale = useSharedValue(0.7);

  const greetY = useSharedValue(-20);
  const greetOpacity = useSharedValue(0);

  const subY = useSharedValue(10);
  const subOpacity = useSharedValue(0);

  const streakOpacity = useSharedValue(0);

  const btnY = useSharedValue(40);
  const btnOpacity = useSharedValue(0);

  const screenOpacity = useSharedValue(1);
  const navigatedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const data = await getUserData();
      setStreakCount(data.streak.current);
    })();
  }, []);

  useEffect(() => {
    sunY.value = withTiming(0, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
    sunOpacity.value = withTiming(1, { duration: 800 });
    sunScale.value = withSpring(1, { damping: 10, stiffness: 90 });

    greetY.value = withDelay(
      600,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) })
    );
    greetOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));

    subY.value = withDelay(
      1200,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) })
    );
    subOpacity.value = withDelay(1200, withTiming(1, { duration: 800 }));

    streakOpacity.value = withDelay(1600, withTiming(1, { duration: 600 }));

    btnY.value = withDelay(
      2200,
      withSpring(0, { damping: 10, stiffness: 90 })
    );
    btnOpacity.value = withDelay(
      2200,
      withTiming(1, { duration: 800 }, (finished) => {
        if (finished) {
          // light haptic on button appear scheduled via JS thread
        }
      })
    );

    const t = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, 2400);
    return () => clearTimeout(t);
  }, [
    sunY,
    sunOpacity,
    sunScale,
    greetY,
    greetOpacity,
    subY,
    subOpacity,
    streakOpacity,
    btnY,
    btnOpacity,
  ]);

  const sunStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sunY.value }, { scale: sunScale.value }],
    opacity: sunOpacity.value,
  }));
  const greetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: greetY.value }],
    opacity: greetOpacity.value,
  }));
  const subStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: subY.value }],
    opacity: subOpacity.value,
  }));
  const streakStyle = useAnimatedStyle(() => ({
    opacity: streakOpacity.value,
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: btnY.value }],
    opacity: btnOpacity.value,
  }));
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const onContinue = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    screenOpacity.value = withTiming(0, { duration: 400 }, (finished) => {
      if (finished) {
        // navigation handled in JS thread below
      }
    });
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 400);
  };

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StatusBar style={gradient.statusBar} />
      <LinearGradient
        colors={gradient.colors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
      />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.content}>
          <Animated.Text style={[styles.greeting, { color: textColor }, greetStyle]}>
            {greeting}
          </Animated.Text>
          <Animated.Text style={[styles.sun, sunStyle]}>☀️</Animated.Text>
          <Animated.Text style={[styles.subtitle, { color: subtleColor }, subStyle]}>
            {subtitle}
          </Animated.Text>
          {streakCount > 0 ? (
            <Animated.Text style={[styles.streak, { color: textColor }, streakStyle]}>
              {`🔥 ${streakCount} day streak`}
            </Animated.Text>
          ) : null}
        </View>
        <Animated.View style={[styles.ctaWrap, btnStyle]}>
          <Pressable onPress={onContinue} style={styles.cta}>
            <Text style={styles.ctaText}>See Today's Inspiration</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, justifyContent: 'space-between' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  greeting: {
    fontFamily: FONTS.displayBold,
    fontSize: 36,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  sun: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.85,
    marginBottom: SPACING.lg,
  },
  streak: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    marginTop: SPACING.sm,
  },
  ctaWrap: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  cta: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
  },
  ctaText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: COLORS.white,
  },
});
