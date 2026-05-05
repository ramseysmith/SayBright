import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CATEGORIES, AFFIRMATIONS, Category } from '../../src/data/affirmations';
import { PACKS } from '../../src/data/packs';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../src/constants/theme';
import { hexWithAlpha } from '../../src/utils/affirmations';
import { usePremium } from '../../src/context/PremiumContext';
import { getDailyUsage } from '../../src/services/storage';
import { BannerAdWrapper } from '../../src/components/BannerAdWrapper';
import { getPurchasedPacks } from '../../src/services/purchases';

const FREE_BROWSE_VIEWS = 5;

export default function BrowseScreen() {
  const [query, setQuery] = useState('');
  const [browseViews, setBrowseViews] = useState(0);
  const [ownedPacks, setOwnedPacks] = useState<string[]>([]);
  const router = useRouter();
  const { isPremium } = usePremium();

  const loadUsage = useCallback(async () => {
    const usage = await getDailyUsage();
    setBrowseViews(usage.browseViewCount);
    const owned = await getPurchasedPacks();
    setOwnedPacks(owned);
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  useFocusEffect(
    useCallback(() => {
      loadUsage();
    }, [loadUsage])
  );

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
    if (cat.isPremium && !isPremium) {
      router.push('/paywall');
      return;
    }
    router.push({ pathname: '/category/[id]', params: { id: cat.id } });
  };

  const countFor = (id: string) =>
    AFFIRMATIONS.filter((a) => a.categoryId === id).length;

  const remaining = Math.max(0, FREE_BROWSE_VIEWS - browseViews);

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
      {!isPremium ? (
        <Text style={styles.viewCounter}>
          {remaining} of {FREE_BROWSE_VIEWS} free views today
        </Text>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {filteredCategories.map((cat) => {
            const locked = cat.isPremium && !isPremium;
            return (
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
                {locked ? (
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={22} color={COLORS.white} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          {filteredCategories.length === 0 ? (
            <Text style={styles.emptyResult}>No matches found.</Text>
          ) : null}
        </View>

        <View style={styles.packsSection}>
          <View style={styles.packsHeaderRow}>
            <Text style={styles.packsTitle}>Affirmation Packs</Text>
            <Pressable hitSlop={8} onPress={() => router.push('/packs')}>
              <Text style={styles.packsSeeAll}>See all</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.packsRow}
          >
            {PACKS.map((pack) => {
              const owned = ownedPacks.includes(pack.productId);
              return (
                <Pressable
                  key={pack.id}
                  onPress={() => router.push('/packs')}
                  style={[
                    styles.packCard,
                    { backgroundColor: hexWithAlpha(pack.color, 0.15) },
                  ]}
                >
                  <Text style={styles.packEmoji}>{pack.emoji}</Text>
                  <Text style={styles.packName}>{pack.name}</Text>
                  <Text
                    style={[
                      styles.packPrice,
                      owned && { color: COLORS.successGreen },
                    ]}
                  >
                    {owned ? '✓ Owned' : pack.price}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
      <BannerAdWrapper />
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
  viewCounter: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
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
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyResult: {
    width: '100%',
    textAlign: 'center',
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xl,
  },
  packsSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  packsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  packsTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.subtitle,
    color: COLORS.textPrimary,
  },
  packsSeeAll: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.primaryGold,
  },
  packsRow: {
    paddingRight: SPACING.lg,
    gap: SPACING.md,
  },
  packCard: {
    width: 140,
    padding: SPACING.md,
    borderRadius: 14,
    alignItems: 'center',
  },
  packEmoji: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  packName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  packPrice: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: COLORS.primaryGold,
  },
});
