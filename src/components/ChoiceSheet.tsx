import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Tap from './Tap';
import { C } from '../theme/colors';

export interface Choice {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ChoiceSheetProps {
  visible: boolean;
  title: string;
  choices: Choice[];
  onClose: () => void;
}

/**
 * A small bottom sheet of choices. Android has no ActionSheetIOS, so the
 * recording options use this there; hardware back closes it like Cancel.
 */
export function ChoiceSheet({ visible, title, choices, onClose }: ChoiceSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrim}>
        <Tap style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {choices.map((c) => (
            <Tap
              key={c.label}
              style={styles.row}
              pressedStyle={styles.pressed}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                c.onPress();
              }}
            >
              <Text style={[styles.label, c.destructive ? styles.destructive : null]}>{c.label}</Text>
            </Tap>
          ))}
          <Tap style={[styles.row, styles.cancel]} pressedStyle={styles.pressed} accessibilityRole="button" onPress={onClose}>
            <Text style={[styles.label, styles.cancelLabel]}>Cancel</Text>
          </Tap>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: C.scrim },
  sheet: {
    backgroundColor: C.bubble,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  title: { color: C.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 8 },
  row: { minHeight: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  pressed: { backgroundColor: C.accentDim },
  label: { color: C.accent, fontSize: 17, fontWeight: '600' },
  destructive: { color: C.danger },
  cancel: { marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderStrong, borderRadius: 0 },
  cancelLabel: { color: C.text },
});
