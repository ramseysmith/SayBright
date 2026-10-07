import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ListRenderItem,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../src/constants/theme';
import {
  addCustomAffirmation,
  CustomAffirmation,
  CUSTOM_AFFIRMATION_MAX_LENGTH,
  deleteCustomAffirmation,
  getUserData,
  updateCustomAffirmation,
} from '../src/services/storage';
import { useShare } from '../src/context/ShareContext';
import { trackEvent } from '../src/services/analytics';

export default function MyAffirmationsScreen() {
  const router = useRouter();
  const { shareAffirmation } = useShare();
  const [items, setItems] = useState<CustomAffirmation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await getUserData();
    setItems(data.customAffirmations);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canSave = draft.trim().length > 0;

  const resetComposer = () => {
    setDraft('');
    setEditingId(null);
    Keyboard.dismiss();
  };

  const onSave = async () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    if (editingId) {
      setItems(await updateCustomAffirmation(editingId, draft));
    } else {
      const updated = await addCustomAffirmation(draft);
      setItems(updated);
      trackEvent('custom_affirmation_created', { total: updated.length });
    }
    resetComposer();
  };

  const onEdit = (item: CustomAffirmation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setEditingId(item.id);
    setDraft(item.text);
  };

  const onDelete = (item: CustomAffirmation) => {
    Alert.alert('Delete this affirmation?', item.text, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => {}
          );
          const updated = await deleteCustomAffirmation(item.id);
          setItems(updated);
          if (editingId === item.id) resetComposer();
          trackEvent('custom_affirmation_deleted', { total: updated.length });
        },
      },
    ]);
  };

  const onShare = (item: CustomAffirmation) => {
    shareAffirmation({
      id: item.id,
      text: item.text,
      categoryId: 'custom',
      isPremium: false,
    });
  };

  const renderItem: ListRenderItem<CustomAffirmation> = ({ item }) => (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable onPress={() => onDelete(item)} style={styles.deleteAction}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      )}
    >
      <Pressable
        onPress={() => onEdit(item)}
        style={[styles.row, editingId === item.id && styles.rowEditing]}
      >
        <Text style={styles.rowText}>{item.text}</Text>
        <Pressable
          hitSlop={12}
          onPress={() => onShare(item)}
          style={styles.rowIcon}
        >
          <Ionicons name="share-outline" size={22} color={COLORS.textSecondary} />
        </Pressable>
        <Pressable hitSlop={12} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={22} color={COLORS.textSecondary} />
        </Pressable>
      </Pressable>
    </ReanimatedSwipeable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons
              name="chevron-back"
              size={26}
              color={COLORS.textPrimary}
            />
          </Pressable>
          <Text style={styles.header}>My Affirmations</Text>
        </View>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="I am..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            maxLength={CUSTOM_AFFIRMATION_MAX_LENGTH}
            style={styles.input}
          />
          <View style={styles.composerFooter}>
            <Text style={styles.counter}>
              {draft.length}/{CUSTOM_AFFIRMATION_MAX_LENGTH}
            </Text>
            <View style={styles.composerButtons}>
              {editingId ? (
                <Pressable onPress={resetComposer} hitSlop={8}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onSave}
                disabled={!canSave}
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              >
                <Text style={styles.saveText}>
                  {editingId ? 'Update' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {loaded && items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✍️</Text>
            <Text style={styles.emptyTitle}>Write your own</Text>
            <Text style={styles.emptySubtitle}>
              The words that move you most are often your own. Write an
              affirmation above and it will be saved here, ready to read or
              share.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.cream },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  header: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.title,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  composer: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderRadius: 16,
    padding: SPACING.md,
  },
  input: {
    fontFamily: FONTS.displayRegular,
    fontSize: FONT_SIZES.subtitle,
    color: COLORS.textPrimary,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  counter: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
  },
  composerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginRight: SPACING.md,
  },
  saveBtn: {
    backgroundColor: COLORS.primaryGold,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.white,
  },
  listContent: { paddingBottom: SPACING.xxl },
  row: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  rowEditing: { backgroundColor: '#FFF1DC' },
  rowText: {
    flex: 1,
    marginRight: SPACING.md,
    fontFamily: FONTS.displayRegular,
    fontSize: FONT_SIZES.subtitle,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  rowIcon: { marginRight: SPACING.md },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginLeft: SPACING.lg,
  },
  deleteAction: {
    backgroundColor: COLORS.warmCoral,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  deleteText: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
    fontSize: FONT_SIZES.body,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.md },
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
