/**
 * Seasonal packs (1.4.0): a small set of fresh affirmations each month it
 * runs, free for everyone, so there is something new to open the app for.
 * A pack shows in Browse and on the end of day card while its month is on;
 * anything saved from it stays in Favorites after the month ends.
 *
 * Each pack borrows the glyph and palette of an existing category (`art`).
 * Add a pack here and it appears on its own; months repeat every year.
 */
import type { Affirmation, Category } from './affirmations';

export interface SeasonalPack {
  id: string;
  name: string;
  /** One line under the name on the Browse card */
  blurb: string;
  /** Category whose glyph and palette this pack uses */
  art: string;
  /** Months it runs, 1 to 12 */
  months: number[];
  texts: string[];
}

export const SEASONAL_PACKS: SeasonalPack[] = [
  {
    id: 'season_gratitude',
    name: 'Gratitude Season',
    blurb: 'Fifteen for November, the month of thanks',
    art: 'gratitude',
    months: [11],
    texts: [
      'I notice the small good things, and they add up to a good life.',
      'I am thankful for the people who make ordinary days feel warm.',
      'There is enough at my table, and I share it gladly.',
      'I thank my body for carrying me through another year.',
      'I am grateful for the lessons that did not feel like gifts at first.',
      'Today I say thank you out loud to someone who has earned it.',
      'I let myself enjoy what I have before reaching for more.',
      'I am thankful for the home I have made, however simple it is.',
      'The kindness I have received lives on in the kindness I give.',
      'I am grateful for slow mornings, warm drinks and quiet minutes.',
      'I look back on this year and find more to thank than to regret.',
      'I give thanks for the people who stayed and bless the ones who left.',
      'My gratitude grows every time I stop to name it.',
      'I am thankful for who I am becoming.',
      'I carry a thankful heart into every room I enter.',
    ],
  },
  {
    id: 'season_rest',
    name: 'Rest and Reflect',
    blurb: 'Fifteen for December, to close the year gently',
    art: 'calm',
    months: [12],
    texts: [
      'I am allowed to rest before the year is finished.',
      'I did more this year than I give myself credit for.',
      'I can enjoy this season without making it perfect.',
      'I forgive myself for what I did not get to.',
      'My worth is not measured by how busy my December is.',
      'I choose presence over presents.',
      'I let the quiet days be quiet.',
      'I honor how far I have come since January.',
      'I can say no and still be generous.',
      'I release this year with thanks and without regret.',
      'I give myself the same warmth I give everyone else.',
      'The people I love want my company, not my perfection.',
      'I end this year kinder to myself than I began it.',
      'I make room for joy, even in a full week.',
      'I welcome what comes next from a rested place.',
    ],
  },
  {
    id: 'season_fresh_start',
    name: 'Fresh Start',
    blurb: 'Fifteen for January, one steady step at a time',
    art: 'morning',
    months: [1],
    texts: [
      'I begin again, and beginning again is a strength.',
      'I do not need a new me. I need a kind plan.',
      'Small steps taken daily will carry me further than big promises.',
      'I choose one thing today and give it my full attention.',
      'I am patient with slow progress.',
      'A missed day is a pause, never the end.',
      'I build habits that fit the life I actually live.',
      'I keep the promises I make to myself.',
      'This year I measure myself against who I was, not against anyone else.',
      'I have everything I need to take the next step.',
      'I let go of last year and keep what it taught me.',
      'I show up today, even if I show up small.',
      'My goals are allowed to change as I learn.',
      'I celebrate starting as much as finishing.',
      'This is my year to be steady.',
    ],
  },
];

/** Legacy display fields (emoji and color) that share cards and widgets still read */
export const SEASON_ICON = '🍂';
export const SEASON_COLOR = '#4CAF50';

export function isSeasonalId(id: string): boolean {
  return id.startsWith('season_');
}

export function getSeasonalPack(id: string): SeasonalPack | undefined {
  return SEASONAL_PACKS.find((p) => p.id === id);
}

/** The pack running this month, if there is one. */
export function getActivePack(now: Date = new Date()): SeasonalPack | undefined {
  return SEASONAL_PACKS.find((p) => p.months.includes(now.getMonth() + 1));
}

export function packAffirmations(pack: SeasonalPack): Affirmation[] {
  return pack.texts.map((text, i) => ({
    id: `${pack.id}_${String(i + 1).padStart(2, '0')}`,
    text,
    categoryId: pack.id,
    isPremium: false,
  }));
}

/** Every pack's affirmations, running or not, so saved ones always resolve. */
export const SEASONAL_AFFIRMATIONS: Affirmation[] = SEASONAL_PACKS.flatMap(packAffirmations);

export function packAsCategory(pack: SeasonalPack): Category {
  return { id: pack.id, name: pack.name, icon: SEASON_ICON, color: SEASON_COLOR, isPremium: false };
}
