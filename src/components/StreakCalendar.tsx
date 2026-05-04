import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../constants/theme';
import { getUserData } from '../services/storage';
import { getTodayKey } from '../utils/affirmations';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface StreakCalendarProps {
  visible: boolean;
  onClose: () => void;
}

interface CalendarCell {
  key: string;
  day: number | null;
  dateKey: string | null;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildCells(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ key: `pad-${i}`, day: null, dateKey: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      key: `d-${d}`,
      day: d,
      dateKey: formatDateKey(year, month, d),
    });
  }
  return cells;
}

export function StreakCalendar({ visible, onClose }: StreakCalendarProps) {
  const today = new Date();
  const todayKey = getTodayKey();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [history, setHistory] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [longest, setLongest] = useState(0);

  const refresh = useCallback(async () => {
    const data = await getUserData();
    setHistory(data.streak.history);
    setCurrent(data.streak.current);
    setLongest(data.streak.longest);
  }, []);

  useEffect(() => {
    if (visible) {
      refresh();
    }
  }, [visible, refresh]);

  const cells = useMemo(() => buildCells(year, month), [year, month]);
  const checkInSet = useMemo(() => new Set(history), [history]);

  const goPrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.title}>Your Streak</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Current</Text>
              <Text style={styles.statValue}>{current} 🔥</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Longest</Text>
              <Text style={styles.statValue}>{longest} ⭐</Text>
            </View>
          </View>

          <View style={styles.monthNav}>
            <Pressable onPress={goPrev} hitSlop={12} style={styles.navBtn}>
              <Ionicons
                name="chevron-back"
                size={22}
                color={COLORS.textPrimary}
              />
            </Pressable>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <Pressable onPress={goNext} hitSlop={12} style={styles.navBtn}>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={COLORS.textPrimary}
              />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {DAY_LABELS.map((d, idx) => (
              <Text key={`${d}-${idx}`} style={styles.weekLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell) => {
              if (cell.day === null) {
                return <View key={cell.key} style={styles.cell} />;
              }
              const isCheckedIn =
                cell.dateKey !== null && checkInSet.has(cell.dateKey);
              const isToday = cell.dateKey === todayKey;
              return (
                <View key={cell.key} style={styles.cell}>
                  <View
                    style={[
                      styles.dayCircle,
                      isCheckedIn && styles.dayChecked,
                      isToday && !isCheckedIn && styles.dayTodayOutline,
                      isToday && isCheckedIn && styles.dayTodayGlow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isCheckedIn && styles.dayTextChecked,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.title,
    color: COLORS.textPrimary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: SPACING.lg },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.md,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.subtitle,
    color: COLORS.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChecked: {
    backgroundColor: COLORS.primaryGold,
  },
  dayTodayOutline: {
    borderWidth: 2,
    borderColor: COLORS.primaryGold,
  },
  dayTodayGlow: {
    shadowColor: COLORS.primaryGold,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  dayText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  dayTextChecked: {
    color: COLORS.white,
    fontFamily: FONTS.bodyBold,
  },
});
