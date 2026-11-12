import * as StoreReview from 'expo-store-review';
import { getUserData, updateUserData } from './storage';

// Ask right after a real win (the day's five finished, or a new favorite),
// never on a timer or when the app opens (HQ docs/acquisition.md 2.3). Apple
// shows the dialog at most three times a year; we wait 60 days between asks.
const MIN_DAYS_BETWEEN_PROMPTS = 60;

export async function maybeRequestReview(trigger: 'daily_set' | 'favorite'): Promise<void> {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;
  } catch {
    return;
  }

  const data = await getUserData();

  if (data.lastReviewPrompt) {
    const lastPrompt = new Date(data.lastReviewPrompt);
    const now = new Date();
    const daysSince =
      (now.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) return;
  }

  try {
    await StoreReview.requestReview();
    await updateUserData((current) => ({
      ...current,
      lastReviewPrompt: new Date().toISOString(),
    }));
    const { trackEvent } = await import('./analytics');
    trackEvent('review_prompted', { kind: trigger });
  } catch {
    // Silently ignore: Apple rate-limits this dialog
  }
}
