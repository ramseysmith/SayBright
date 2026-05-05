import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import {
  deleteRecording,
  getRecordingUri,
  hasRecording,
  playRecording,
  startRecording,
  stopRecording,
} from '../services/audio';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../constants/theme';

const MAX_DURATION_S = 30;

interface RecordingModalProps {
  visible: boolean;
  affirmationId: string | null;
  affirmationText: string;
  onClose: () => void;
  onSaved: () => void;
}

type Phase = 'idle' | 'recording' | 'review' | 'playing' | 'saving';

export function RecordingModal({
  visible,
  affirmationId,
  affirmationText,
  onClose,
  onSaved,
}: RecordingModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [draftUri, setDraftUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackRef = useRef<Audio.Sound | null>(null);

  const pulse = useSharedValue(1);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  const reset = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cancelAnimation(pulse);
    cancelAnimation(ring1);
    cancelAnimation(ring2);
    pulse.value = 1;
    ring1.value = 0;
    ring2.value = 0;
    setSeconds(0);
    setDraftUri(null);
    setPhase('idle');
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    if (playbackRef.current) {
      playbackRef.current.unloadAsync().catch(() => {});
      playbackRef.current = null;
    }
  };

  const startRingPulse = () => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    ring1.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    ring2.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 600 }),
        withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) })
      ),
      -1,
      false
    );
  };

  const handleStartRecording = async () => {
    if (!affirmationId) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const recording = await startRecording();
      recordingRef.current = recording;
      setPhase('recording');
      setSeconds(0);
      startRingPulse();
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_DURATION_S) {
            handleStopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (e) {
      Alert.alert(
        'Microphone unavailable',
        'Please allow microphone access in Settings to record affirmations.'
      );
    }
  };

  const handleStopRecording = async () => {
    if (!recordingRef.current || !affirmationId) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cancelAnimation(pulse);
    cancelAnimation(ring1);
    cancelAnimation(ring2);
    pulse.value = 1;
    try {
      const uri = await stopRecording(recordingRef.current, affirmationId);
      recordingRef.current = null;
      setDraftUri(uri);
      setPhase('review');
    } catch {
      reset();
      Alert.alert('Recording failed', 'Please try again.');
    }
  };

  const handlePlayback = async () => {
    if (!draftUri) return;
    try {
      setPhase('playing');
      const sound = await playRecording(draftUri);
      playbackRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          playbackRef.current = null;
          setPhase('review');
        }
      });
    } catch {
      setPhase('review');
    }
  };

  const handleReRecord = async () => {
    if (affirmationId) {
      await deleteRecording(affirmationId);
    }
    setDraftUri(null);
    setSeconds(0);
    setPhase('idle');
  };

  const handleSave = () => {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
    onSaved();
    onClose();
  };

  const handleCancel = async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    if (affirmationId) {
      const exists = await hasRecording(affirmationId);
      if (exists && draftUri && draftUri === getRecordingUri(affirmationId)) {
        await deleteRecording(affirmationId);
      }
    }
    onClose();
  };

  const ring1Style = useAnimatedStyle(() => ({
    opacity: 1 - ring1.value,
    transform: [{ scale: 1 + ring1.value * 1.5 }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: 1 - ring2.value,
    transform: [{ scale: 1 + ring2.value * 1.5 }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={{ width: 60 }} />
          <Text style={styles.title}>Record Your Voice</Text>
          <Pressable onPress={handleCancel} hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Say this affirmation in your own words.
        </Text>

        <View style={styles.promptCard}>
          <Text style={styles.promptText}>{affirmationText}</Text>
        </View>

        <View style={styles.controlsArea}>
          {phase === 'idle' ? (
            <Pressable onPress={handleStartRecording}>
              <Animated.View style={[styles.recordButton, buttonStyle]}>
                <Ionicons name="mic" size={36} color={COLORS.white} />
              </Animated.View>
            </Pressable>
          ) : phase === 'recording' ? (
            <View style={styles.recordingArea}>
              <Animated.View style={[styles.ring, ring1Style]} />
              <Animated.View style={[styles.ring, ring2Style]} />
              <Pressable onPress={handleStopRecording}>
                <Animated.View style={[styles.recordButton, buttonStyle]}>
                  <Ionicons name="stop" size={32} color={COLORS.white} />
                </Animated.View>
              </Pressable>
            </View>
          ) : phase === 'playing' ? (
            <View style={styles.recordButtonStatic}>
              <ActivityIndicator color={COLORS.white} />
            </View>
          ) : (
            <Pressable onPress={handlePlayback}>
              <View style={styles.recordButtonStatic}>
                <Ionicons name="play" size={32} color={COLORS.white} />
              </View>
            </Pressable>
          )}

          <Text style={styles.timer}>{formatTime(seconds)}</Text>

          <Waveform active={phase === 'recording' || phase === 'playing'} />
        </View>

        {phase === 'review' || phase === 'playing' ? (
          <View style={styles.reviewActions}>
            <Pressable
              onPress={handleSave}
              disabled={phase === 'playing'}
              style={[styles.saveBtn, phase === 'playing' && { opacity: 0.5 }]}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
            <Pressable onPress={handleReRecord} style={styles.reRecordBtn}>
              <Text style={styles.reRecordText}>Re record</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function Waveform({ active }: { active: boolean }) {
  const indices = Array.from({ length: 24 }, (_, i) => i);
  return (
    <View style={styles.waveform}>
      {indices.map((i) => (
        <WaveformBar key={i} index={i} active={active} />
      ))}
    </View>
  );
}

function WaveformBar({ index, active }: { index: number; active: boolean }) {
  const value = useSharedValue(8);
  useEffect(() => {
    if (active) {
      value.value = withRepeat(
        withSequence(
          withTiming(8 + Math.random() * 28, {
            duration: 250 + (index % 5) * 60,
          }),
          withTiming(8 + Math.random() * 18, { duration: 320 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(value);
      value.value = withTiming(8, { duration: 200 });
    }
  }, [active, index, value]);
  const style = useAnimatedStyle(() => ({
    height: value.value,
  }));
  return <Animated.View style={[styles.bar, style]} />;
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
  cancel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  promptCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: 16,
  },
  promptText: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.subtitle,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
  },
  controlsArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.warmCoral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonStatic: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.warmCoral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 107, 107, 0.4)',
  },
  timer: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    marginTop: SPACING.md,
    gap: 3,
  },
  bar: {
    width: 4,
    backgroundColor: COLORS.primaryGold,
    borderRadius: 2,
  },
  reviewActions: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  saveBtn: {
    backgroundColor: COLORS.primaryGold,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: COLORS.white,
  },
  reRecordBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  reRecordText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
});
