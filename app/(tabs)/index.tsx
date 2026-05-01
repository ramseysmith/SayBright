import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  AFFIRMATIONS,
  Affirmation,
  getAffirmationsByCategories,
  getCategoryById,
} from '../../src/data/affirmations';
import { getUserData } from '../../src/services/storage';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../src/constants/theme';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

interface GradientConfig {
  colors: readonly [string, string];
  textOnLight: boolean;
}

function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

const GRADIENTS: Record<TimeOfDay, GradientConfig> = {
  morning: { colors: ['#F5A623', '#FFB088'], textOnLight: true },
  afternoon: { colors: ['#87CEEB', '#B8A9E8'], textOnLight: true },
  evening: { colors: ['#FF6B6B', '#2D1B69'], textOnLight: false },
  night: { colors: ['#1A1A2E', '#0D0D2B'], textOnLight: false },
};

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

export default function TodayScreen() {
  const [affirmation, setAffirmation] = useState<Affirmation | null>(null);
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const gradient = GRADIENTS[timeOfDay];
  const textColor = gradient.textOnLight ? COLORS.textPrimary : COLORS.white;
  const subtleTextColor = gradient.textOnLight
    ? 'rgba(26, 26, 46, 0.7)'
    : 'rgba(255, 255, 255, 0.85)';

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getUserData();
      const pool = getAffirmationsByCategories(
        data.preferences.selectedCategories
      );
      const chosen = pickRandom(pool.length > 0 ? pool : AFFIRMATIONS);
      if (active) setAffirmation(chosen);
    })();
    return () => {
      active = false;
    };
  }, []);

  const category = affirmation
    ? getCategoryById(affirmation.categoryId)
    : undefined;

  return (
    <View style={styles.root}>
      <StatusBar style={gradient.textOnLight ? 'dark' : 'light'} />
      <LinearGradient
        colors={gradient.colors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.streakBadge}>
            <Text style={[styles.streakText, { color: textColor }]}>🔥 0</Text>
          </View>
        </View>

        <View style={styles.cardWrapper}>
          {affirmation ? (
            <View style={styles.card}>
              {category ? (
                <View style={styles.categoryRow}>
                  <Text style={styles.categoryEmoji}>{category.icon}</Text>
                  <Text style={[styles.categoryName, { color: subtleTextColor }]}>
                    {category.name}
                  </Text>
                </View>
              ) : null}
              <Text style={[styles.affirmation, { color: textColor }]}>
                {affirmation.text}
              </Text>
              <View style={styles.actionsRow}>
                <Pressable hitSlop={12} style={styles.iconButton}>
                  <Ionicons name="heart-outline" size={24} color={textColor} />
                </Pressable>
                <Pressable hitSlop={12} style={styles.iconButton}>
                  <Ionicons
                    name="share-outline"
                    size={24}
                    color={textColor}
                  />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
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
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  categoryEmoji: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
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
  iconButton: {
    padding: SPACING.xs,
  },
});
