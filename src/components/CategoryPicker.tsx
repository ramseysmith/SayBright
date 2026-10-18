import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, Category } from '../data/affirmations';
import { FONTS } from '../constants/theme';
import { C, CATEGORY_PALETTES, RADIUS } from '../theme/colors';
import CategoryIcon from './art/CategoryIcon';
import Tap from './Tap';
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
        const pal = CATEGORY_PALETTES[cat.id] ?? CATEGORY_PALETTES.confidence;
        return (
          <Tap
            key={cat.id}
            onPress={() => handleToggle(cat)}
            style={[styles.card, { backgroundColor: pal.from }, selected && !locked ? styles.cardSelected : null, locked ? styles.cardLocked : null]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled: locked }}
            accessibilityLabel={locked ? `${cat.name}, Premium` : cat.name}
          >
            <CategoryIcon name={cat.id} size={26} color={pal.ink} />
            <Text style={[styles.name, { color: pal.ink }]} numberOfLines={2}>
              {cat.name}
            </Text>
            {locked ? (
              <View style={styles.lock}>
                <Ionicons name="lock-closed" size={11} color={C.onGold} />
              </View>
            ) : selected ? (
              <View style={styles.check}>
                <Ionicons name="checkmark" size={14} color={C.onAccent} />
              </View>
            ) : null}
          </Tap>
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
    rowGap: 10,
  },
  card: {
    width: '48.5%',
    minHeight: 92,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 2,
    borderColor: C.transparent,
    justifyContent: 'space-between',
    gap: 8,
  },
  cardSelected: { borderColor: C.accent },
  cardLocked: { opacity: 0.6 },
  name: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  lock: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
