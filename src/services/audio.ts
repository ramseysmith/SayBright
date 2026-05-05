import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const RECORDINGS_DIR = `${FileSystem.documentDirectory}recordings/`;

export async function ensureRecordingsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, {
      intermediates: true,
    });
  }
}

export async function startRecording(): Promise<Audio.Recording> {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Microphone permission not granted');
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  await recording.startAsync();
  return recording;
}

export async function stopRecording(
  recording: Audio.Recording,
  affirmationId: string
): Promise<string> {
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = recording.getURI();
  if (!uri) throw new Error('Recording URI is null');

  await ensureRecordingsDir();
  const destUri = `${RECORDINGS_DIR}${affirmationId}.m4a`;

  const dest = await FileSystem.getInfoAsync(destUri);
  if (dest.exists) {
    await FileSystem.deleteAsync(destUri);
  }
  await FileSystem.moveAsync({ from: uri, to: destUri });
  return destUri;
}

export async function playRecording(uri: string): Promise<Audio.Sound> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });
  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.playAsync();
  return sound;
}

export async function deleteRecording(affirmationId: string): Promise<void> {
  const uri = `${RECORDINGS_DIR}${affirmationId}.m4a`;
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri);
  }
}

export function getRecordingUri(affirmationId: string): string {
  return `${RECORDINGS_DIR}${affirmationId}.m4a`;
}

export async function hasRecording(affirmationId: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(getRecordingUri(affirmationId));
  return info.exists;
}

export async function getRecordedAffirmationIds(): Promise<string[]> {
  await ensureRecordingsDir();
  const files = await FileSystem.readDirectoryAsync(RECORDINGS_DIR);
  return files
    .filter((f) => f.endsWith('.m4a'))
    .map((f) => f.replace('.m4a', ''));
}
