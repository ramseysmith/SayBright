import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AFFIRMATIONS, CATEGORIES, Category } from '../../src/data/affirmations';
import { FONTS } from '../../src/constants/theme';
import { C, CATEGORY_PALETTES, MAX_CONTENT_WIDTH, RADIUS } from '../../src/theme/colors';
import { usePremium } from '../../src/context/PremiumContext';
import { isCategoryOpen } from '../../src/lib/free-tier';
import CategoryIcon from '../../src/components/art/CategoryIcon';
import Tap from '../../src/components/Tap';

/**
 * Every category, for everyone (1.3.0). Confidence is fully open on the free
 * tier; the others open to a short preview that ends on the paywall.
 */
export default function BrowseScreen() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { isPremium } = usePremium();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const columns = contentWidth > 520 ? 3 : 2;
  const gap = 12;
  const tileWidth = (contentWidth - 40 - gap * (columns - 1)) / columns;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    const ids = new Set(AFFIRMATIONS.filter((a) => a.text.toLowerCase().includes(q)).map((a) => a.categoryId));
    return CATEGORIES.filter((c) => c.name.toLowerCase().includes(q) || ids.has(c.id));
  }, [query]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of AFFIRMATIONS) out[a.categoryId] = (out[a.categoryId] ?? 0) + 1;
    return out;
  }, []);

  const open = (cat: Category) => {
    Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: '/category/[id]', params: { id: cat.id } });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.bg1, C.bg0]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.column, { width: contentWidth }]}>
          <Text style={styles.title}>Browse</Text>
          <Text style={styles.sub}>
            {isPremium ? `${AFFIRMATIONS.length} affirmations in ${CATEGORIES.length} categories` : 'Confidence is free. Peek inside the rest.'}
          </Text>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={C.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search categories or words"
              placeholderTextColor={C.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel="Search"
            />
          </View>
          <ScrollView contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.grid, { gap }]}>
              {filtered.map((cat) => {
                const pal = CATEGORY_PALETTES[cat.id] ?? CATEGORY_PALETTES.confidence;
                const unlocked = isCategoryOpen(cat.id, isPremium);
                return (
                  <Tap
                    key={cat.id}
                    onPress={() => open(cat)}
                    style={[styles.tile, { width: tileWidth }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.name}, ${counts[cat.id] ?? 0} affirmations${unlocked ? '' : ', preview'}`}
                  >
                    <LinearGradient colors={[pal.from, pal.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <View style={styles.tileTop}>
                      <View style={styles.glyph}>
                        <CategoryIcon name={cat.id} size={30} color={pal.ink} />
                      </View>
                      {!unlocked ? (
                        <View style={styles.lock}>
                          <Ionicons name="lock-closed" size={11} color={C.onGold} />
                        </View>
                      ) : !isPremium ? (
                        <View style={styles.freeTag}>
                          <Text style={styles.freeText}>Free</Text>
                        </View>
                      ) : null}
                    </View>
                    <View>
                      <Text style={[styles.name, { color: pal.ink }]} numberOfLines={2}>
                        {cat.name}
                      </Text>
                      <Text style={[styles.count, { color: pal.ink }]}>{counts[cat.id] ?? 0} affirmations</Text>
                    </View>
                  </Tap>
                );
              })}
            </View>
            {filtered.length === 0 ? <Text style={styles.empty}>No matches. Try a different word.</Text> : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg0 },
  safe: { flex: 1, alignItems: 'center' },
  column: { flex: 1, paddingHorizontal: 20 },
  title: { fontFamily: FONTS.displayBold, fontSize: 30, color: C.text, marginTop: 8 },
  sub: { fontFamily: FONTS.bodyRegular, fontSize: 15, color: C.textSecondary, marginTop: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: C.surfaceStrong,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 16, color: C.text },
  gridContent: { paddingTop: 16, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { aspectRatio: 1, borderRadius: RADIUS.md, padding: 14, overflow: 'hidden', justifyContent: 'space-between' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  glyph: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  freeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: C.surfaceStrong },
  freeText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: C.text },
  name: { fontFamily: FONTS.bodyBold, fontSize: 16 },
  count: { fontFamily: FONTS.bodyRegular, fontSize: 12, marginTop: 2, opacity: 0.85 },
  empty: { fontFamily: FONTS.bodyRegular, fontSize: 15, color: C.textSecondary, textAlign: 'center', marginTop: 32 },
});
