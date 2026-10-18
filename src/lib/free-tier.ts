/**
 * What SayBright gives for free (refresh 1.3.0, Ramsey's Oct 13 choices).
 *
 * * Five affirmations a day on Today, from the categories you picked.
 * * One category fully open in Browse: Confidence.
 * * Every other category shows a short preview that ends on the paywall.
 *
 * Before 1.3.0 free users had one affirmation a day and Browse was locked, so
 * nothing anyone already had moves behind Premium and no legacy access is needed.
 * Premium: every category, unlimited affirmations, widgets, your own
 * affirmations and voice recordings, no ads.
 */
export const FREE_DAILY_LIMIT = 5;
export const OPEN_CATEGORY_ID = 'confidence';
export const PREVIEW_COUNT = 3;

export function isCategoryOpen(categoryId: string, isPremium: boolean): boolean {
  return isPremium || categoryId === OPEN_CATEGORY_ID;
}
