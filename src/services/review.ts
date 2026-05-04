import * as StoreReview from 'expo-store-review';
import { getUserData, updateUserData } from './storage';

export async function maybeRequestReview(): Promise<void> {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;
  } catch {
    return;
  }

  const data = await getUserData();

  if (data.sessionCount < 5) return;
  if (data.streak.current < 3) return;
  if (data.favorites.length < 2) return;

  if (data.lastReviewPrompt) {
    const lastPrompt = new Date(data.lastReviewPrompt);
    const now = new Date();
    const daysSince =
      (now.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 30) return;
  }

  try {
    await StoreReview.requestReview();
    await updateUserData((current) => ({
      ...current,
      lastReviewPrompt: new Date().toISOString(),
    }));
  } catch {
    // Silently ignore: Apple rate-limits this dialog
  }
}
