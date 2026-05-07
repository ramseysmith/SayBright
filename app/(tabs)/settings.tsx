import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Modal,
  Linking,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../src/constants/theme';
import { CATEGORIES } from '../../src/data/affirmations';
import {
  getUserData,
  setSelectedCategories,
  updateUserData,
} from '../../src/services/storage';
import { useToast } from '../../src/components/Toast';
import { CategoryPicker } from '../../src/components/CategoryPicker';
import { usePremium } from '../../src/context/PremiumContext';
import { restorePurchases } from '../../src/services/purchases';
import {
  cancelAllReminders,
  getRandomNotificationAffirmation,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from '../../src/services/notifications';
import { getAffirmationsByCategories } from '../../src/utils/affirmations';
import { CROSS_PROMO, URLS } from '../../src/constants/urls';
import { getPurchasedPacks } from '../../src/services/purchases';
import { PACKS } from '../../src/data/packs';
import {
  deleteRecording,
  getRecordedAffirmationIds,
  getRecordingUri,
  playRecording,
} from '../../src/services/audio';
import { AFFIRMATIONS } from '../../src/data/affirmations';
import { Audio } from 'expo-av';
import { trackEvent } from '../../src/services/analytics';

function parseHHMM(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map((v) => parseInt(v, 10));
  return { hour: isNaN(h) ? 8 : h, minute: isNaN(m) ? 0 : m };
}

function formatTimeDisplay(value: string): string {
  const { hour, minute } = parseHHMM(value);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

export default function SettingsScreen() {
  const toast = useToast();
  const router = useRouter();
  const { isPremium, refreshPremiumStatus } = usePremium();
  const [selected, setSelected] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftSelected, setDraftSelected] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [ownedPackCount, setOwnedPackCount] = useState(0);
  const [recordedIds, setRecordedIds] = useState<string[]>([]);
  const [recordingsModalOpen, setRecordingsModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    const data = await getUserData();
    setSelected(data.preferences.selectedCategories);
    setReminderEnabled(data.preferences.reminderEnabled);
    setReminderTime(data.preferences.reminderTime);
    const packs = await getPurchasedPacks();
    setOwnedPackCount(packs.length);
    const ids = await getRecordedAffirmationIds();
    setRecordedIds(ids);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const openPicker = () => {
    setDraftSelected(selected);
    setPickerOpen(true);
  };

  const savePicker = async () => {
    if (draftSelected.length < 1) {
      toast.show('Pick at least one category.');
      return;
    }
    await setSelectedCategories(draftSelected);
    setSelected(draftSelected);
    setPickerOpen(false);
  };

  const scheduleWithCurrentSelection = async (
    hour: number,
    minute: number
  ) => {
    const data = await getUserData();
    const pool = getAffirmationsByCategories(
      data.preferences.selectedCategories
    );
    const text = getRandomNotificationAffirmation(pool);
    await scheduleDailyReminder(hour, minute, text);
  };

  const handleReminderToggle = async (next: boolean) => {
    if (next) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications are disabled for SayBright',
          'Please enable them in your device settings to receive daily reminders.'
        );
        return;
      }
      const { hour, minute } = parseHHMM(reminderTime);
      await scheduleWithCurrentSelection(hour, minute);
      await updateUserData((current) => ({
        ...current,
        preferences: { ...current.preferences, reminderEnabled: true },
      }));
      setReminderEnabled(true);
      trackEvent('notification_enabled');
      toast.show('Daily reminder scheduled.');
    } else {
      await cancelAllReminders();
      await updateUserData((current) => ({
        ...current,
        preferences: { ...current.preferences, reminderEnabled: false },
      }));
      setReminderEnabled(false);
      trackEvent('notification_disabled');
    }
  };

  const handleTimeRowPress = () => {
    if (!reminderEnabled) {
      toast.show('Turn on Reminders to set the time.');
      return;
    }
    setTimePickerOpen(true);
  };

  const onTimeChange = async (
    event: DateTimePickerEvent,
    date?: Date
  ) => {
    if (Platform.OS === 'android') {
      setTimePickerOpen(false);
    }
    if (event.type === 'dismissed' || !date) {
      return;
    }
    const hour = date.getHours();
    const minute = date.getMinutes();
    const formatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    setReminderTime(formatted);
    await updateUserData((current) => ({
      ...current,
      preferences: { ...current.preferences, reminderTime: formatted },
    }));
    if (reminderEnabled) {
      await scheduleWithCurrentSelection(hour, minute);
    }
  };

  const onPremiumRowPress = () => {
    if (isPremium) {
      const url =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/account/subscriptions'
          : 'https://play.google.com/store/account/subscriptions';
      Linking.openURL(url).catch(() => {
        toast.show('Could not open subscription settings.');
      });
    } else {
      router.push('/paywall');
    }
  };

  const onRestore = async () => {
    setRestoring(true);
    try {
      const ok = await restorePurchases();
      if (ok) {
        await refreshPremiumStatus();
        toast.show('Purchases restored successfully.');
      } else {
        toast.show('No previous purchases found.');
      }
    } finally {
      setRestoring(false);
    }
  };

  const showSoonToast = () => toast.show('Coming soon.');

  const openExternal = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        toast.show('Could not open link.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      toast.show('Could not open link.');
    }
  };

  const onWidgetsPress = () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    Alert.alert(
      'Add SayBright Widget',
      'Long press your home screen, tap the plus button in the top left, then search for SayBright.',
      [{ text: 'Got it' }]
    );
  };

  const onPacksPress = () => {
    router.push('/packs');
  };

  const onRecordingsPress = () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    setRecordingsModalOpen(true);
  };

  const selectedEmojis = selected
    .map((id) => CATEGORIES.find((c) => c.id === id)?.icon ?? '')
    .filter(Boolean)
    .join('  ');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Settings</Text>

        <SectionHeader title="Preferences" />
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>Reminders</Text>
              <Text style={styles.rowSubtitle}>
                Daily affirmation push, {formatTimeDisplay(reminderTime)}
              </Text>
            </View>
            <View style={styles.rowAccessory}>
              <Switch
                value={reminderEnabled}
                onValueChange={handleReminderToggle}
                trackColor={{ true: COLORS.primaryGold, false: '#D1D5DB' }}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <Pressable onPress={handleTimeRowPress} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>Reminder Time</Text>
              <Text style={styles.rowSubtitle}>
                {formatTimeDisplay(reminderTime)}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={openPicker} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>Categories</Text>
              <Text style={styles.rowSubtitle}>{selectedEmojis || 'None'}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={onWidgetsPress} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>
                {isPremium
                  ? 'Add Home Screen Widget'
                  : 'Home Screen Widgets'}
              </Text>
              <Text style={styles.rowSubtitle}>
                {isPremium
                  ? 'See affirmations at a glance.'
                  : 'Available with Premium.'}
              </Text>
            </View>
            {!isPremium ? (
              <Ionicons
                name="lock-closed"
                size={18}
                color={COLORS.textSecondary}
              />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.textSecondary}
              />
            )}
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={onRecordingsPress} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>My Recordings</Text>
              <Text style={styles.rowSubtitle}>
                {!isPremium
                  ? 'Available with Premium.'
                  : recordedIds.length > 0
                    ? `${recordedIds.length} recorded`
                    : 'Record your first affirmation.'}
              </Text>
            </View>
            {!isPremium ? (
              <Ionicons
                name="lock-closed"
                size={18}
                color={COLORS.textSecondary}
              />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.textSecondary}
              />
            )}
          </Pressable>
        </View>

        <SectionHeader title="Subscription" />
        <View style={styles.section}>
          <Pressable onPress={onPremiumRowPress} style={styles.row}>
            <Text style={styles.rowEmoji}>✨</Text>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>
                {isPremium ? 'Premium Active ✨' : 'SayBright Premium'}
              </Text>
              <Text style={styles.rowSubtitle}>
                {isPremium
                  ? 'Manage your subscription in the App Store.'
                  : 'Unlock all categories, widgets, and more.'}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={onPacksPress} style={styles.row}>
            <Text style={styles.rowEmoji}>📦</Text>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>Affirmation Packs</Text>
              <Text style={styles.rowSubtitle}>
                {ownedPackCount > 0
                  ? `${ownedPackCount} of ${PACKS.length} owned`
                  : 'Browse themed packs'}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={onRestore} disabled={restoring} style={styles.row}>
            <Ionicons
              name="refresh-circle-outline"
              size={22}
              color={COLORS.textSecondary}
              style={styles.rowIcon}
            />
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>Restore Purchases</Text>
            </View>
            {restoring ? (
              <ActivityIndicator color={COLORS.textSecondary} />
            ) : null}
          </Pressable>
        </View>

        <SectionHeader title="About" />
        <View style={styles.section}>
          <SettingsRow
            iconName="star-outline"
            title="Rate SayBright"
            onPress={showSoonToast}
          />
          <View style={styles.divider} />
          <SettingsRow
            iconName="share-outline"
            title="Share SayBright"
            onPress={showSoonToast}
          />
          <View style={styles.divider} />
          <SettingsRow
            iconName="document-text-outline"
            title="Privacy Policy"
            onPress={() => openExternal(URLS.privacy)}
          />
          <View style={styles.divider} />
          <SettingsRow
            iconName="document-text-outline"
            title="Terms of Service"
            onPress={() => openExternal(URLS.terms)}
          />
        </View>

        <SectionHeader title="More Apps" />
        <View style={[styles.section, styles.crossPromoSection]}>
          {CROSS_PROMO.map((app, idx) => (
            <View key={app.id}>
              {idx > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                onPress={() => openExternal(app.url)}
                style={styles.row}
              >
                <Text style={styles.rowEmoji}>{app.icon}</Text>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{app.title}</Text>
                  <Text style={styles.rowSubtitle}>{app.subtitle}</Text>
                </View>
                <Ionicons
                  name="open-outline"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>SayBright v1.0.0</Text>
      </ScrollView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={12}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Categories</Text>
            <Pressable onPress={savePicker} hitSlop={12}>
              <Text style={styles.modalSave}>Save</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Pick the categories that show up on your Today tab.
            </Text>
            <CategoryPicker
              selectedIds={draftSelected}
              onChange={setDraftSelected}
              isPremium={isPremium}
              onLockedTap={() => {
                setPickerOpen(false);
                router.push('/paywall');
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {timePickerOpen ? (
        <View
          style={
            Platform.OS === 'ios'
              ? styles.iosTimePickerWrap
              : styles.androidPickerInline
          }
        >
          <DateTimePicker
            value={(() => {
              const { hour, minute } = parseHHMM(reminderTime);
              const d = new Date();
              d.setHours(hour, minute, 0, 0);
              return d;
            })()}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={() => setTimePickerOpen(false)}
              style={styles.iosTimePickerDone}
            >
              <Text style={styles.iosTimePickerDoneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <RecordingsListModal
        visible={recordingsModalOpen}
        recordedIds={recordedIds}
        onClose={() => setRecordingsModalOpen(false)}
        onRefresh={refresh}
      />
    </SafeAreaView>
  );
}

function RecordingsListModal({
  visible,
  recordedIds,
  onClose,
  onRefresh,
}: {
  visible: boolean;
  recordedIds: string[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [activeSound, setActiveSound] = useState<Audio.Sound | null>(null);

  const onPlay = async (id: string) => {
    if (activeSound) {
      await activeSound.unloadAsync().catch(() => {});
      setActiveSound(null);
    }
    try {
      const sound = await playRecording(getRecordingUri(id));
      setActiveSound(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          setActiveSound(null);
        }
      });
    } catch {
      // ignore
    }
  };

  const onDelete = async (id: string) => {
    if (activeSound) {
      await activeSound.unloadAsync().catch(() => {});
      setActiveSound(null);
    }
    await deleteRecording(id);
    await onRefresh();
  };

  const close = async () => {
    if (activeSound) {
      await activeSound.unloadAsync().catch(() => {});
      setActiveSound(null);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <View style={{ width: 60 }} />
          <Text style={styles.modalTitle}>My Recordings</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Text style={styles.modalCancel}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {recordedIds.length === 0 ? (
            <Text style={styles.modalSubtitle}>
              You have not recorded any affirmations yet.
            </Text>
          ) : (
            recordedIds.map((id) => {
              const aff = AFFIRMATIONS.find((a) => a.id === id);
              const text = aff?.text ?? id;
              return (
                <View key={id} style={styles.recordingRow}>
                  <Text style={styles.recordingText} numberOfLines={2}>
                    {text}
                  </Text>
                  <Pressable
                    hitSlop={12}
                    onPress={() => onPlay(id)}
                    style={styles.recordingAction}
                  >
                    <Ionicons name="play" size={20} color={COLORS.primaryGold} />
                  </Pressable>
                  <Pressable
                    hitSlop={12}
                    onPress={() => onDelete(id)}
                    style={styles.recordingAction}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={COLORS.warmCoral}
                    />
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingsRow({
  iconName,
  title,
  onPress,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons
        name={iconName}
        size={22}
        color={COLORS.textSecondary}
        style={styles.rowIcon}
      />
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  scrollContent: { paddingBottom: SPACING.xxl },
  screenTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.title,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  rowIcon: { marginRight: SPACING.md },
  rowEmoji: { fontSize: 22, marginRight: SPACING.md },
  rowMain: { flex: 1 },
  rowTitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  rowSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rowAccessory: { flexDirection: 'row', alignItems: 'center' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginLeft: SPACING.md,
  },
  premiumPill: {
    backgroundColor: COLORS.primaryGold,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 999,
    marginRight: SPACING.sm,
  },
  premiumPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.white,
  },
  footer: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  modalContainer: { flex: 1, backgroundColor: COLORS.cream },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  modalTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  modalCancel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  modalSave: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.primaryGold,
  },
  modalContent: { padding: SPACING.lg },
  modalSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  iosTimePickerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.07)',
    paddingBottom: SPACING.lg,
  },
  iosTimePickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  iosTimePickerDoneText: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.primaryGold,
    fontSize: FONT_SIZES.body,
  },
  androidPickerInline: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  crossPromoSection: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryGold,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  recordingText: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginRight: SPACING.md,
  },
  recordingAction: {
    paddingHorizontal: SPACING.sm,
  },
});
