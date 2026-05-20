import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '../constants/theme';

interface AnimatedSplashProps {
  onComplete: () => void;
}

export function AnimatedSplash({ onComplete }: AnimatedSplashProps) {
  const iconScale = useSharedValue(0.8);
  const iconOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    iconScale.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });
    iconOpacity.value = withTiming(1, { duration: 600 });
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    taglineOpacity.value = withDelay(900, withTiming(1, { duration: 300 }));
    screenOpacity.value = withDelay(
      1200,
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      })
    );
  }, [iconScale, iconOpacity, titleOpacity, taglineOpacity, screenOpacity, onComplete]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, screenStyle]} pointerEvents="none">
      <Animated.Text style={[styles.icon, iconStyle]}>☀️</Animated.Text>
      <Animated.Text style={[styles.title, titleStyle]}>SayBright</Animated.Text>
      <Animated.Text style={[styles.tagline, taglineStyle]}>
        Speak your brightest self into existence
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: COLORS.primaryGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 36,
    color: COLORS.white,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
