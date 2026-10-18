import { useCallback, useEffect, useState } from 'react';
import { FlatList, ListRenderItem, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Affirmation } from '../../src/data/affirmations';
import { FONTS } from '../../src/constants/theme';
import { C, CATEGORY_PALETTES, MAX_CONTENT_WIDTH, RADIUS } from '../../src/theme/colors';
import { getAffirmationsByCategory, getCategoryById } from '../../src/utils/affirmations';
import { getUserData, toggleFavorite } from '../../src/services/storage';
import { useShare } from '../../src/context/ShareContext';
import { trackEvent } from '../../src/services/analytics';
import { usePremium } from '../../src/context/PremiumContext';
import { PREVIEW_COUNT, isCategoryOpen } from '../../src/lib/free-tier';
import CategoryIcon from '../../src/components/art/CategoryIcon';
import Tap from '../../src/components/Tap';

/**
 * One category. Open categories list every affirmation; on the free tier the
 * others show the first few and end on a card that opens the paywall.
 */
export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const category = id ? getCategoryById(id) : undefined;
  const all = id ? getAffirmationsByCategory(id) : [];
  const { shareAffirmation } = useShare();
  const { isPremium } = usePremium();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const unlocked = id ? isCategoryOpen(id, isPremium) : false;
  const items = unlocked ? all : all.slice(0, PREVIEW_COUNT);
  const pal = (id && CATEGORY_PALETTES[id]) || CATEGORY_PALETTES.confidence;

  const [favorites, setFavorites] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const data = await getUserData();
    setFavorites(data.favorites);
  }, []);

  useEffect(() => {
    if (id) trackEvent('category_viewed', { categoryId: id });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onToggle = async (affId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const wasFavorited = favorites.includes(affId);
    const updated = await toggleFavorite(affId);
    setFavorites(updated);
    if (!wasFavorited) trackEvent('affirmation_favorited', { categoryId: id ?? '' });
  };

  const renderItem: ListRenderItem<Affirmation> = ({ item }) => {
    const isFav = favorites.includes(item.id);
    return (
      <View style={styles.row}>
        <Text style={styles.rowText}>{item.text}</Text>
        <View style={styles.rowActions}>
          <Tap hitSlop={12} onPress={() => onToggle(item.id)} accessibilityRole="button" accessibilityLabel={isFav ? 'Remove from favorites' : 'Save to favorites'}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? C.heart : C.textMuted} />
          </Tap>
          <Tap hitSlop={12} onPress={() => shareAffirmation(item)} accessibilityRole="button" accessibilityLabel="Share">
            <Ionicons name="share-outline" size={22} color={C.textMuted} />
          </Tap>
        </View>
      </View>
    );
  };

  if (!category) {
    return (
      <SafeAreaView style={styles.missingWrap}>
        <Text style={styles.missing}>That category was not found.</Text>
        <Tap onPress={() => router.back()} style={styles.missingBack} accessibilityRole="button">
          <Text style={styles.missingBackText}>Go back</Text>
        </Tap>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient colors={[pal.to, pal.from, C.bg0]} locations={[0, 0.22, 0.42]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.column, { width: contentWidth }]}>
          <Tap onPress={() => router.back()} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={pal.ink} />
          </Tap>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.titleBlock}>
                <View style={styles.glyph}>
                  <CategoryIcon name={category.id} size={36} color={pal.ink} />
                </View>
                <Text style={[styles.title, { color: pal.ink }]}>{category.name}</Text>
                <Text style={[styles.count, { color: pal.ink }]}>
                  {unlocked ? `${all.length} affirmations` : `Preview, ${PREVIEW_COUNT} of ${all.length}`}
                </Text>
              </View>
            }
            ListFooterComponent={
              !unlocked ? (
                <View style={styles.lockCard}>
                  <View style={styles.lockIcon}>
                    <Ionicons name="lock-closed" size={18} color={C.onGold} />
                  </View>
                  <Text style={styles.lockTitle}>{all.length - PREVIEW_COUNT} more in {category.name}</Text>
                  <Text style={styles.lockBody}>Premium opens every category, with no daily limit and no ads.</Text>
                  <Tap
                    onPress={() => router.push('/paywall?source=preview')}
                    style={styles.lockCta}
                    pressedStyle={styles.lockCtaPressed}
                    accessibilityRole="button"
                  >
                    <Text style={styles.lockCtaText}>Open {category.name}</Text>
                  </Tap>
                </View>
              ) : null
            }
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg0 },
  safe: { flex: 1, alignItems: 'center' },
  column: { flex: 1, paddingHorizontal: 20 },
  back: { width: 40, height: 40, marginLeft: -8, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 40 },
  titleBlock: { paddingTop: 4, paddingBottom: 20 },
  glyph: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: FONTS.displayBold, fontSize: 30, marginTop: 12 },
  count: { fontFamily: FONTS.bodyMedium, fontSize: 14, marginTop: 2, opacity: 0.85 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginBottom: 10,
    borderRadius: RADIUS.md,
    backgroundColor: C.surfaceStrong,
    borderWidth: 1,
    borderColor: C.border,
  },
  rowText: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 16, lineHeight: 23, color: C.text },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  lockCard: {
    marginTop: 6,
    padding: 22,
    borderRadius: RADIUS.lg,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBorder,
    alignItems: 'center',
  },
  lockIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  lockTitle: { fontFamily: FONTS.displayBold, fontSize: 21, color: C.text, marginTop: 12, textAlign: 'center' },
  lockBody: { fontFamily: FONTS.bodyRegular, fontSize: 15, lineHeight: 21, color: C.textSecondary, marginTop: 6, textAlign: 'center' },
  lockCta: { marginTop: 16, height: 50, paddingHorizontal: 26, borderRadius: 25, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  lockCtaPressed: { backgroundColor: C.goldDeep },
  lockCtaText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: C.onGold },
  missingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg0, padding: 24 },
  missing: { fontFamily: FONTS.bodyMedium, fontSize: 16, color: C.text },
  missingBack: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: C.accent },
  missingBackText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: C.onAccent },
});
