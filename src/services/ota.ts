/**
 * Over the air updates that actually reach people.
 *
 * expo-updates downloads a new bundle on a cold start and runs it only on the
 * next cold start. iOS keeps apps suspended for days, so most people kept
 * running the bundle inside the binary: on Nov 13 2026 every real paywall_view
 * since the Nov 12 update still came from it (no paywall_version, no
 * paywall_close). This hook checks again when the app returns after a while in
 * the background and reloads into the new bundle right away, before the person
 * starts doing anything.
 *
 * bundleId() labels every analytics event with the bundle that sent it, so a
 * reading can count only the people who have a change.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

const AWAY_MS = 10 * 60 * 1000;
// Restart only while the person has barely started (the splash shows again and
// in memory state such as an onboarding step resets). A slower download stays
// stored and runs on the next cold start, as expo-updates does by default.
const RELOAD_WINDOW_MS = 4 * 1000;
let busy = false;

// Paywalls and purchases hold reloads while they are open (a restart mid purchase loses it)
let holds = 0;
export function holdUpdates(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      holds -= 1;
    }
  };
}

export function bundleId(): string {
  try {
    if (!Updates.isEnabled) return 'disabled';
    if (Updates.isEmbeddedLaunch || !Updates.updateId) return 'embedded';
    return Updates.updateId.slice(0, 8);
  } catch {
    return 'unknown';
  }
}

async function applyIfNew(canReload: () => boolean): Promise<void> {
  if (__DEV__ || !Updates.isEnabled || busy) return;
  busy = true;
  const resumedAt = Date.now();
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    const quick = Date.now() - resumedAt <= RELOAD_WINDOW_MS;
    if (fetched.isNew && quick && holds === 0 && canReload()) await Updates.reloadAsync();
  } catch {
    // No network or a bad manifest: keep running what we have
  } finally {
    busy = false;
  }
}

/** Mount once at the root. canReload says when a restart would not interrupt anyone. */
export function useApplyPendingUpdate(canReload: () => boolean = () => true): void {
  useEffect(() => {
    let leftAt = 0;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') leftAt = Date.now();
      else if (state === 'active' && leftAt && Date.now() - leftAt > AWAY_MS) {
        leftAt = 0;
        applyIfNew(canReload);
      }
    });
    return () => sub.remove();
  }, [canReload]);
}
