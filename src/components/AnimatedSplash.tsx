import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '../constants/theme';

interface AnimatedSplashProps {
  onFinished: () => void;
}

export function AnimatedSplash({ onFinished }: AnimatedSplashProps) {
  const iconScale = useSharedValue(0.8);
  const iconOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const overallOpacity = useSharedValue(1);

  useEffect(() => {
    iconScale.value = withSpring(1, { damping: 12, stiffness: 140 });
    iconOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    titleOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    taglineOpacity.value = withDelay(
      900,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    overallOpacity.value = withDelay(
      1200,
      withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(onFinished)();
        }
      })
    );
  }, [iconOpacity, iconScale, onFinished, overallOpacity, taglineOpacity, titleOpacity]);

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
  const containerStyle = useAnimatedStyle(() => ({
    opacity: overallOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <Animated.View style={iconStyle}>
        <Text style={styles.icon}>☀️</Text>
      </Animated.View>
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
    backgroundColor: COLORS.primaryGold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  icon: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 36,
    color: COLORS.white,
    marginBottom: 12,
  },
  tagline: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
