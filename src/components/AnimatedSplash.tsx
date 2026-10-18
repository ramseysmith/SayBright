import { useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import BrightMark, { MarkRaysSvg } from './art/BrightMark';
import { C } from '../theme/colors';
import { FONTS } from '../constants/theme';

/**
 * Cold start animation (refresh 1.3.0, Drift's AnimatedSplashScreen pattern).
 *
 * The first frame is the native splash still exactly: assets/splash-icon.png
 * (design/splash/splash.svg, the bubble and sun) ART points wide, centered on
 * C.splash, as configured for expo-splash-screen in app.json. The native still
 * is hidden only once this view has drawn that frame, so there is no flash.
 *
 * Then, in about 1.3 seconds: the dawn gradient comes up behind the mark, the
 * rays flare, the mark lifts a little, the wordmark settles in, and the layer
 * fades to reveal Today, which is already rendered underneath. With Reduce
 * Motion on it holds the still briefly and fades.
 *
 * UNVERIFIED until a cold start is seen on device.
 */

/** Must match imageWidth of the expo-splash-screen plugin in app.json. */
const ART = 200;
const T = { rise: 480, rays: 360, wordDelay: 200, word: 380, hold: 860, fade: 400, reducedHold: 250, reducedFade: 300 };

interface AnimatedSplashProps {
  onComplete: () => void;
  onBeginFadeOut?: () => void;
}

export function AnimatedSplash({ onComplete, onBeginFadeOut }: AnimatedSplashProps) {
  const reduceMotion = useReducedMotion();
  const started = useRef(false);

  const sky = useSharedValue(0);
  const rays = useSharedValue(0);
  const lift = useSharedValue(0);
  const word = useSharedValue(0);
  const fade = useSharedValue(1);

  const finish = useCallback(() => onComplete(), [onComplete]);
  const beginFade = useCallback(() => onBeginFadeOut?.(), [onBeginFadeOut]);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    if (reduceMotion) {
      beginFade();
      fade.value = withDelay(
        T.reducedHold,
        withTiming(0, { duration: T.reducedFade }, (done) => {
          if (done) runOnJS(finish)();
        })
      );
      return;
    }
    const ease = Easing.out(Easing.cubic);
    sky.value = withTiming(1, { duration: T.rise, easing: ease });
    rays.value = withSequence(
      withTiming(1, { duration: T.rays, easing: ease }),
      withTiming(0.7, { duration: T.hold - T.rays, easing: Easing.inOut(Easing.sin) })
    );
    lift.value = withTiming(1, { duration: T.hold, easing: Easing.inOut(Easing.sin) });
    word.value = withDelay(T.wordDelay, withTiming(1, { duration: T.word, easing: ease }));
    fade.value = withDelay(
      T.hold,
      withTiming(0, { duration: T.fade, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(finish)();
      })
    );
    setTimeout(beginFade, T.hold);
  }, [reduceMotion, sky, rays, lift, word, fade, finish, beginFade]);

  // Hide the native still only once this view's first frame is on screen
  const onLayout = useCallback(() => {
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
      start();
    });
  }, [start]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const skyStyle = useAnimatedStyle(() => ({ opacity: sky.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * 14 }] }));
  const raysStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + rays.value * 0.6,
    transform: [{ scale: 1 + rays.value * 0.12 }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 8 }],
  }));

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      onLayout={onLayout}
      pointerEvents="none"
      accessible
      accessibilityLabel="SayBright"
    >
      <Animated.View style={[StyleSheet.absoluteFill, skyStyle]}>
        <LinearGradient
          colors={[C.dawnTop, C.dawnMid, C.dawnLow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.center}>
        <Animated.View style={markStyle}>
          <BrightMark size={ART} rays={false} />
          <Animated.View style={[StyleSheet.absoluteFill, raysStyle]}>
            <MarkRaysSvg size={ART} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.wordWrap, wordStyle]}>
          <Text style={styles.word}>SayBright</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.splash,
    zIndex: 1000,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordWrap: {
    position: 'absolute',
    top: '50%',
    marginTop: ART / 2 + 4,
  },
  word: {
    fontFamily: FONTS.displayBold,
    fontSize: 30,
    color: C.textOnSky,
    letterSpacing: 0.3,
  },
});
