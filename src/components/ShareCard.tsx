import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants/theme';
import { Affirmation } from '../data/affirmations';
import { getCategoryById } from '../utils/affirmations';
import { TimeGradient } from '../utils/time';

const CARD_WIDTH = 540;
const CARD_HEIGHT = 960;

interface ShareCardProps {
  affirmation: Affirmation | null;
  gradient: TimeGradient;
  isPremium: boolean;
}

export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { affirmation, gradient, isPremium },
  ref
) {
  const category = affirmation
    ? getCategoryById(affirmation.categoryId)
    : undefined;
  const text = affirmation?.text ?? '';
  const isLight = gradient.statusBar === 'dark';
  const primaryText = isLight ? '#1A1A2E' : COLORS.white;
  const subtleText = isLight
    ? 'rgba(26, 26, 46, 0.65)'
    : 'rgba(255, 255, 255, 0.85)';
  const dividerColor = isLight
    ? 'rgba(26, 26, 46, 0.3)'
    : 'rgba(255, 255, 255, 0.3)';
  const watermarkColor = isLight
    ? 'rgba(26, 26, 46, 0.5)'
    : 'rgba(255, 255, 255, 0.5)';

  return (
    <View
      ref={ref}
      collapsable={false}
      style={styles.card}
    >
      <LinearGradient
        colors={gradient.colors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
      />
      <View style={styles.content}>
        {category ? (
          <Text style={styles.emoji}>{category.icon}</Text>
        ) : null}
        <Text style={[styles.affirmation, { color: primaryText }]}>
          {text}
        </Text>
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />
        {category ? (
          <Text style={[styles.categoryName, { color: subtleText }]}>
            {category.name}
          </Text>
        ) : null}
      </View>
      {!isPremium ? (
        <View style={styles.watermark}>
          <Text style={[styles.watermarkText, { color: watermarkColor }]}>
            ☀️ SayBright
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 32,
  },
  affirmation: {
    fontFamily: FONTS.displayBold,
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 46,
    marginBottom: 24,
  },
  divider: {
    width: 60,
    height: 2,
    borderRadius: 1,
    marginVertical: 16,
  },
  categoryName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 20,
  },
  watermark: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  watermarkText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
  },
});
