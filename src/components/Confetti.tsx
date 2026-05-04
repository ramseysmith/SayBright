import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COLORS = [
  '#F5A623',
  '#FF6B6B',
  '#B8A9E8',
  '#4CAF50',
  '#FFD700',
  '#2196F3',
];

interface Particle {
  key: number;
  size: number;
  color: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rotation: number;
  delay: number;
  isCircle: boolean;
}

function buildParticles(count: number): Particle[] {
  const cx = SCREEN_W / 2;
  const cy = SCREEN_H / 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 180 + Math.random() * 220;
    return {
      key: i,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      startX: cx,
      startY: cy,
      endX: cx + Math.cos(angle) * distance,
      endY: cy + Math.sin(angle) * distance + 60,
      rotation: Math.random() * 720 - 360,
      delay: Math.random() * 120,
      isCircle: Math.random() > 0.5,
    };
  });
}

export function Confetti({ count = 36 }: { count?: number }) {
  const particles = useMemo(() => buildParticles(count), [count]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p) => (
        <ConfettiPiece key={p.key} particle={p} />
      ))}
    </View>
  );
}

function ConfettiPiece({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withTiming(1, {
        duration: 1100 + Math.random() * 400,
        easing: Easing.out(Easing.cubic),
      })
    );
    opacity.value = withDelay(
      particle.delay + 800,
      withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) })
    );
  }, [opacity, particle.delay, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const x =
      particle.startX + (particle.endX - particle.startX) * progress.value;
    const y =
      particle.startY + (particle.endY - particle.startY) * progress.value;
    return {
      transform: [
        { translateX: x - particle.startX },
        { translateY: y - particle.startY },
        { rotate: `${particle.rotation * progress.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: particle.startX - particle.size / 2,
          top: particle.startY - particle.size / 2,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          borderRadius: particle.isCircle ? particle.size / 2 : 2,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
  },
});
