import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../src/constants/theme';
import { PACKS, AffirmationPack } from '../src/data/packs';
import { hexWithAlpha } from '../src/utils/affirmations';
import {
  getPurchasedPacks,
  purchasePack,
  restorePurchases,
} from '../src/services/purchases';
import { useToast } from '../src/components/Toast';
import { usePremium } from '../src/context/PremiumContext';
import { trackEvent } from '../src/services/analytics';

const SUGGEST_EMAIL = 'support@saybright.app';

export default function PacksScreen() {
  const router = useRouter();
  const toast = useToast();
  const { refreshPremiumStatus } = usePremium();
  const [purchased, setPurchased] = useState<string[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const ids = await getPurchasedPacks();
    setPurchased(ids);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onBuy = async (pack: AffirmationPack) => {
    Haptics.selectionAsync();
    setPurchasingId(pack.id);
    try {
      const ok = await purchasePack(pack.productId);
      if (ok) {
        trackEvent('pack_purchased', { packId: pack.id, price: 0.99 });
        await refreshPremiumStatus();
        toast.show(`${pack.name} unlocked.`);
        await refresh();
      }
    } catch {
      Alert.alert(
        'Purchase failed',
        'Something went wrong. Please try again in a moment.'
      );
    } finally {
      setPurchasingId(null);
    }
  };

  const onRestore = async () => {
    const ok = await restorePurchases();
    if (ok) {
      await refresh();
      toast.show('Purchases restored.');
    } else {
      toast.show('No previous purchases found.');
    }
  };

  const onSuggest = () => {
    const url = `mailto:${SUGGEST_EMAIL}?subject=${encodeURIComponent(
      'SayBright Pack Suggestion'
    )}&body=${encodeURIComponent("I would love to see an affirmation pack about: ")}`;
    Linking.openURL(url).catch(() => {
      toast.show('Could not open mail app.');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
        </Pressable>
        <Pressable onPress={onRestore} hitSlop={12}>
          <Text style={styles.restore}>Restore</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Affirmation Packs</Text>
        <Text style={styles.subtitle}>
          Targeted affirmations for life's biggest moments.
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primaryGold} style={{ marginTop: SPACING.lg }} />
        ) : (
          PACKS.map((pack) => (
            <PackRow
              key={pack.id}
              pack={pack}
              owned={purchased.includes(pack.productId)}
              purchasing={purchasingId === pack.id}
              onBuy={() => onBuy(pack)}
              onOpen={() =>
                router.push({
                  pathname: '/pack/[id]',
                  params: { id: pack.id },
                })
              }
            />
          ))
        )}

        <View style={styles.suggestSection}>
          <View style={styles.divider} />
          <Text style={styles.suggestTitle}>More Packs Coming Soon</Text>
          <Text style={styles.suggestSubtitle}>
            Have an idea for a pack? Let us know.
          </Text>
          <Pressable onPress={onSuggest} style={styles.suggestBtn}>
            <Text style={styles.suggestBtnText}>Suggest a Pack</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PackRow({
  pack,
  owned,
  purchasing,
  onBuy,
  onOpen,
}: {
  pack: AffirmationPack;
  owned: boolean;
  purchasing: boolean;
  onBuy: () => void;
  onOpen: () => void;
}) {
  return (
    <Pressable
      onPress={owned ? onOpen : undefined}
      style={[
        styles.packCard,
        { backgroundColor: hexWithAlpha(pack.color, 0.1) },
      ]}
    >
      <Text style={styles.packEmoji}>{pack.emoji}</Text>
      <View style={styles.packBody}>
        <Text style={styles.packName}>{pack.name}</Text>
        <Text style={styles.packDescription}>{pack.description}</Text>
        <Text style={styles.packCount}>15 affirmations</Text>
      </View>
      {owned ? (
        <Text style={styles.ownedText}>✓ Owned</Text>
      ) : (
        <Pressable onPress={onBuy} disabled={purchasing} style={styles.priceBtn}>
          {purchasing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.priceBtnText}>{pack.price}</Text>
          )}
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restore: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  packEmoji: {
    fontSize: 40,
    marginRight: SPACING.md,
  },
  packBody: { flex: 1 },
  packName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  packDescription: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  packCount: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  priceBtn: {
    backgroundColor: COLORS.primaryGold,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    minWidth: 64,
    alignItems: 'center',
  },
  priceBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.white,
  },
  ownedText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.successGreen,
  },
  suggestSection: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'stretch',
    marginBottom: SPACING.lg,
  },
  suggestTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  suggestSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  suggestBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primaryGold,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
  },
  suggestBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.primaryGold,
  },
});
