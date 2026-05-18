import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CATEGORIES, AFFIRMATIONS, Category } from '../../src/data/affirmations';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../src/constants/theme';
import { hexWithAlpha } from '../../src/utils/affirmations';
import { usePremium } from '../../src/context/PremiumContext';

export default function BrowseScreen() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { isPremium } = usePremium();

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return CATEGORIES;
    const q = query.trim().toLowerCase();
    const nameMatch = CATEGORIES.filter((c) =>
      c.name.toLowerCase().includes(q)
    );
    const textMatchIds = new Set(
      AFFIRMATIONS.filter((a) => a.text.toLowerCase().includes(q)).map(
        (a) => a.categoryId
      )
    );
    const merged = new Map<string, Category>();
    for (const c of nameMatch) merged.set(c.id, c);
    for (const c of CATEGORIES) {
      if (textMatchIds.has(c.id)) merged.set(c.id, c);
    }
    return Array.from(merged.values());
  }, [query]);

  const handlePress = (cat: Category) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/category/[id]', params: { id: cat.id } });
  };

  const countFor = (id: string) =>
    AFFIRMATIONS.filter((a) => a.categoryId === id).length;

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.gateWrap}>
          <Text style={styles.gateEmoji}>🔍</Text>
          <Text style={styles.gateTitle}>Explore All Categories</Text>
          <Text style={styles.gateSubtitle}>
            Browse 340+ affirmations across 10 categories with SayBright Premium.
          </Text>
          <Pressable
            onPress={() => router.push('/paywall')}
            style={styles.gateCta}
          >
            <Text style={styles.gateCtaText}>Unlock with Premium</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Browse</Text>
      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={18}
          color={COLORS.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search categories or affirmations"
          placeholderTextColor={COLORS.textSecondary}
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {filteredCategories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => handlePress(cat)}
              style={[
                styles.card,
                { backgroundColor: hexWithAlpha(cat.color, 0.15) },
              ]}
            >
              <Text style={styles.emoji}>{cat.icon}</Text>
              <Text style={styles.name}>{cat.name}</Text>
              <Text style={styles.count}>{countFor(cat.id)} affirmations</Text>
            </Pressable>
          ))}
          {filteredCategories.length === 0 ? (
            <Text style={styles.emptyResult}>No matches found.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.title,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  searchWrap: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  gridContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.md,
  },
  card: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emoji: { fontSize: 32, marginBottom: SPACING.sm },
  name: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  count: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyResult: {
    width: '100%',
    textAlign: 'center',
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xl,
  },
  gateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  gateEmoji: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  gateTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  gateSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  gateCta: {
    backgroundColor: COLORS.primaryGold,
    marginHorizontal: SPACING.xl + 8,
    marginTop: SPACING.lg,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  gateCtaText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.white,
  },
});
