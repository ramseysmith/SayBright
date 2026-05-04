import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, Category } from '../data/affirmations';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../constants/theme';
import { hexWithAlpha } from '../utils/affirmations';
import { useToast } from './Toast';

interface CategoryPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isPremium?: boolean;
  maxSelections?: number;
  onLockedTap?: () => void;
}

export function CategoryPicker({
  selectedIds,
  onChange,
  isPremium = false,
  maxSelections,
  onLockedTap,
}: CategoryPickerProps) {
  const toast = useToast();

  const handleToggle = (cat: Category) => {
    if (cat.isPremium && !isPremium) {
      if (onLockedTap) {
        onLockedTap();
      } else {
        toast.show('Available with SayBright Premium');
      }
      return;
    }
    Haptics.selectionAsync();
    const isSelected = selectedIds.includes(cat.id);
    if (isSelected) {
      onChange(selectedIds.filter((id) => id !== cat.id));
      return;
    }
    if (maxSelections && selectedIds.length >= maxSelections) {
      toast.show(`You can pick up to ${maxSelections} categories.`);
      return;
    }
    onChange([...selectedIds, cat.id]);
  };

  return (
    <View style={styles.grid}>
      {CATEGORIES.map((cat) => {
        const selected = selectedIds.includes(cat.id);
        const locked = cat.isPremium && !isPremium;
        return (
          <Pressable
            key={cat.id}
            onPress={() => handleToggle(cat)}
            style={[
              styles.card,
              { backgroundColor: hexWithAlpha(cat.color, 0.15) },
              selected && {
                borderColor: cat.color,
                backgroundColor: hexWithAlpha(cat.color, 0.28),
              },
            ]}
          >
            <Text style={styles.emoji}>{cat.icon}</Text>
            <Text style={styles.name}>{cat.name}</Text>
            {locked ? (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={20} color={COLORS.white} />
              </View>
            ) : null}
            {selected && !locked ? (
              <View
                style={[styles.check, { backgroundColor: cat.color }]}
              >
                <Ionicons name="checkmark" size={14} color={COLORS.white} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  name: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.body - 2,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
