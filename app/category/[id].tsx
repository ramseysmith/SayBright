import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Affirmation } from '../../src/data/affirmations';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../src/constants/theme';
import {
  getAffirmationsByCategory,
  getCategoryById,
  hexWithAlpha,
} from '../../src/utils/affirmations';
import {
  getDailyUsage,
  getUserData,
  incrementBrowseCount,
  toggleFavorite,
} from '../../src/services/storage';
import { useToast } from '../../src/components/Toast';

const FREE_DAILY_VIEWS = 5;

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const category = id ? getCategoryById(id) : undefined;
  const items = id ? getAffirmationsByCategory(id) : [];
  const isPremium = false;

  const [favorites, setFavorites] = useState<string[]>([]);
  const [browseViews, setBrowseViews] = useState(0);
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const data = await getUserData();
    const usage = await getDailyUsage();
    setFavorites(data.favorites);
    setBrowseViews(usage.browseViewCount);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onOpenAffirmation = async (affId: string) => {
    if (isPremium || openedIds.has(affId)) return;
    if (browseViews >= FREE_DAILY_VIEWS) {
      toast.show(
        'You have reached today’s browse limit. Unlock unlimited browsing with Premium.'
      );
      return;
    }
    const next = await incrementBrowseCount();
    setBrowseViews(next);
    setOpenedIds((prev) => new Set(prev).add(affId));
  };

  const onToggle = async (affId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const updated = await toggleFavorite(affId);
    setFavorites(updated);
  };

  const renderItem: ListRenderItem<Affirmation> = ({ item }) => {
    const isFav = favorites.includes(item.id);
    const limited =
      !isPremium &&
      browseViews >= FREE_DAILY_VIEWS &&
      !openedIds.has(item.id);
    return (
      <Pressable onPress={() => onOpenAffirmation(item.id)} style={styles.row}>
        <Text style={[styles.rowText, limited && styles.rowTextLimited]}>
          {item.text}
        </Text>
        <View style={styles.rowActions}>
          <Pressable hitSlop={12} onPress={() => onToggle(item.id)}>
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={22}
              color={isFav ? COLORS.warmCoral : COLORS.textSecondary}
            />
          </Pressable>
          <Pressable hitSlop={12} style={styles.iconSpacer}>
            <Ionicons
              name="share-outline"
              size={22}
              color={COLORS.textSecondary}
            />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.missing}>Category not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[category.color, hexWithAlpha(category.color, 0.7), COLORS.cream]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={26} color={COLORS.white} />
          </Pressable>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.titleEmoji}>{category.icon}</Text>
          <Text style={styles.titleText}>{category.name}</Text>
          <Text style={styles.titleCount}>{items.length} affirmations</Text>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  container: { flex: 1, backgroundColor: COLORS.cream, padding: SPACING.lg },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  safe: { flex: 1 },
  headerRow: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  titleEmoji: { fontSize: 40 },
  titleText: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.affirmation,
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  titleCount: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
    backgroundColor: COLORS.cream,
  },
  row: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginRight: SPACING.md,
  },
  rowTextLimited: {
    color: COLORS.textSecondary,
  },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  iconSpacer: { marginLeft: SPACING.md },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginLeft: SPACING.lg,
  },
  missing: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
});
