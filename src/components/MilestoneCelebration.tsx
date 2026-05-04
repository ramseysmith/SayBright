import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../constants/theme';
import { MILESTONE_COPY } from '../services/streak';
import { Confetti } from './Confetti';

interface MilestoneCelebrationProps {
  visible: boolean;
  milestone: number | null;
  onClose: () => void;
}

export function MilestoneCelebration({
  visible,
  milestone,
  onClose,
}: MilestoneCelebrationProps) {
  if (!milestone) return null;
  const copy = MILESTONE_COPY[milestone];
  if (!copy) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {visible ? <Confetti /> : null}
        <View style={styles.content}>
          <Text style={styles.emoji}>{copy.emoji}</Text>
          <Text style={styles.title}>{milestone} Day Streak!</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
          <Pressable onPress={onClose} style={styles.cta}>
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 43, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  content: {
    alignItems: 'center',
    maxWidth: 360,
  },
  emoji: {
    fontSize: 96,
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 36,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  cta: {
    backgroundColor: COLORS.primaryGold,
    borderRadius: 999,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  ctaText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.white,
  },
});
