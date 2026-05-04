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
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { Affirmation } from '../../src/data/affirmations';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../src/constants/theme';
import { getUserData, toggleFavorite } from '../../src/services/storage';
import {
  getAffirmationById,
  getCategoryById,
} from '../../src/utils/affirmations';

export default function FavoritesScreen() {
  const [items, setItems] = useState<Affirmation[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const data = await getUserData();
    const resolved = data.favorites
      .map((id) => getAffirmationById(id))
      .filter((a): a is Affirmation => Boolean(a));
    setItems(resolved);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRemove = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await toggleFavorite(id);
    setItems((prev) => prev.filter((a) => a.id !== id));
  };

  const renderItem: ListRenderItem<Affirmation> = ({ item }) => {
    const category = getCategoryById(item.categoryId);
    return (
      <ReanimatedSwipeable
        friction={2}
        rightThreshold={40}
        renderRightActions={() => (
          <Pressable
            onPress={() => onRemove(item.id)}
            style={styles.removeAction}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        )}
      >
        <View style={styles.row}>
          <Text style={styles.rowEmoji}>{category?.icon ?? '💛'}</Text>
          <View style={styles.rowText}>
            <Text style={styles.rowAffirmation}>{item.text}</Text>
            <Text style={styles.rowCategory}>{category?.name ?? ''}</Text>
          </View>
          <Pressable hitSlop={12} onPress={() => onRemove(item.id)}>
            <Ionicons name="heart" size={22} color={COLORS.warmCoral} />
          </Pressable>
        </View>
      </ReanimatedSwipeable>
    );
  };

  if (!loaded) {
    return <SafeAreaView style={styles.container} edges={['top']} />;
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💛</Text>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart on any affirmation to save it here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Favorites</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />
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
  listContent: { paddingBottom: SPACING.xxl },
  row: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  rowEmoji: { fontSize: 24, marginRight: SPACING.md },
  rowText: { flex: 1, marginRight: SPACING.md },
  rowAffirmation: {
    fontFamily: FONTS.displayRegular,
    fontSize: FONT_SIZES.subtitle,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  rowCategory: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginLeft: SPACING.lg,
  },
  removeAction: {
    backgroundColor: COLORS.warmCoral,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  removeText: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
    fontSize: FONT_SIZES.body,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyEmoji: { fontSize: 80, marginBottom: SPACING.lg },
  emptyTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.title,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
