/**
 * When a full screen ad may appear. Graysmith Labs rules, from Drift 1.18.0:
 *
 * 1. Never during the core experience (audio playing, a timer running, a form
 *    being filled). Callers pass that in as `busy`.
 * 2. Never before the person has finished the core action once
 *    (call recordCoreActionFinished() at the success moment).
 * 3. At most one per app session, and not in the first two minutes after launch.
 *
 * Premium people never see ads at all; callers check that first.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'adPolicy.v1';
const MIN_MS_AFTER_LAUNCH = 2 * 60 * 1000;
const launchedAt = Date.now();
let shownThisSession = false;

async function finishedCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw).finished as number) ?? 0 : 0;
  } catch {
    return 0;
  }
}

export async function recordCoreActionFinished(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ finished: (await finishedCount()) + 1 }));
  } catch {
    // Worst case the first ad waits a little longer
  }
}

export async function mayShowInterstitial(busy: boolean): Promise<boolean> {
  if (busy || shownThisSession) return false;
  if (Date.now() - launchedAt < MIN_MS_AFTER_LAUNCH) return false;
  return (await finishedCount()) >= 1;
}

export function markInterstitialShown(): void {
  shownThisSession = true;
}
