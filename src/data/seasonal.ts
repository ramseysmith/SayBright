/**
 * Seasonal packs (1.4.0): a small set of fresh affirmations each month it
 * runs, free for everyone, so there is something new to open the app for.
 * A pack shows in Browse and on the end of day card while its month is on;
 * anything saved from it stays in Favorites after the month ends.
 *
 * Each month also has a Premium pack of 15 for the same season (Ramsey, Nov 11
 * 2026, `isPremium: true`): shown in Browse beside the free one with the lock
 * and a 3 item preview that ends on the paywall (source season_premium), so
 * Premium gets something new every month. The free pack stays free.
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
  /** Premium only: free users see a preview that ends on the paywall */
  isPremium?: boolean;
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
  {
    id: 'season_gratitude_deep',
    name: 'Thankful Heart',
    blurb: 'Fifteen more for November, gratitude that goes deeper',
    art: 'selflove',
    months: [11],
    isPremium: true,
    texts: [
      'I am thankful for the version of me who kept going when it was hard.',
      'I find something to appreciate even on the days that test me.',
      'I thank the people who believed in me before I believed in myself.',
      'Gratitude softens my worries and makes room for peace.',
      'I appreciate my mind for every idea it has carried me through.',
      'I am grateful for second chances, and I give them freely.',
      'Even in a hard season, I can name three good things.',
      'I am thankful for the strength I found in places I did not expect.',
      'I honor the people who came before me and made my life possible.',
      'My life is full of quiet gifts I no longer take for granted.',
      'I thank myself for the rest I take and the boundaries I keep.',
      'I am grateful for the friends who feel like home.',
      'I let gratitude turn what I have into enough.',
      'Every breath is a small gift, and I receive it with thanks.',
      'I end today grateful, and I will begin tomorrow the same way.',
    ],
  },
  {
    id: 'season_winter_light',
    name: 'Winter Light',
    blurb: 'Fifteen more for December, warmth for the darkest days',
    art: 'confidence',
    months: [12],
    isPremium: true,
    texts: [
      'I carry my own light into the longest nights.',
      'Short days remind me to slow down, and I listen.',
      'I protect my energy through every gathering and goodbye.',
      'I give what I can, and what I can is enough.',
      'I make peace with the people and plans that did not go my way.',
      'There is light ahead, and I am already walking toward it.',
      'I let simple comforts fill me up: warm light, good food, kind words.',
      'I welcome the stillness of winter as a time to restore.',
      'My heart stays open even when the world feels cold.',
      'I celebrate in my own way, and my way is valid.',
      'I hold space for joy and grief together this season.',
      'I am proud of the growth this year asked of me.',
      'I spend my time on what truly warms me.',
      'I let this year end softly, without a final push.',
      'I trust that what I planted this year will grow.',
    ],
  },
  {
    id: 'season_new_chapter',
    name: 'New Chapter',
    blurb: 'Fifteen more for January, a year shaped on purpose',
    art: 'career',
    months: [1],
    isPremium: true,
    texts: [
      'I write this chapter with intention and an open heart.',
      'I choose a word for this year and let it guide me.',
      'I am becoming someone my future self will thank.',
      'I make decisions from hope, not from fear.',
      'I trust myself to handle whatever this year brings.',
      'Each morning is a blank page, and I fill it with care.',
      'I let go of habits that no longer fit the person I am growing into.',
      'My dreams are worth the time I give them.',
      'I am ready for good things, and I make room for them.',
      'I set goals that excite me and steps that are kind to me.',
      'Progress counts, even when nobody else can see it yet.',
      'I meet challenges this year with courage and curiosity.',
      'I choose consistency over intensity.',
      'I give myself permission to grow at my own pace.',
      'The best of this year is still ahead of me.',
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

/** The free pack running this month, if there is one. */
export function getActivePack(now: Date = new Date()): SeasonalPack | undefined {
  return SEASONAL_PACKS.find((p) => !p.isPremium && p.months.includes(now.getMonth() + 1));
}

/** The Premium pack running this month, beside the free one, if there is one. */
export function getActivePremiumPack(now: Date = new Date()): SeasonalPack | undefined {
  return SEASONAL_PACKS.find((p) => p.isPremium && p.months.includes(now.getMonth() + 1));
}

/** True for a Premium seasonal pack id; free packs and categories are false. */
export function isPremiumPackId(id: string): boolean {
  return !!getSeasonalPack(id)?.isPremium;
}

export function packAffirmations(pack: SeasonalPack): Affirmation[] {
  return pack.texts.map((text, i) => ({
    id: `${pack.id}_${String(i + 1).padStart(2, '0')}`,
    text,
    categoryId: pack.id,
    isPremium: !!pack.isPremium,
  }));
}

/** Every pack's affirmations, running or not, so saved ones always resolve. */
export const SEASONAL_AFFIRMATIONS: Affirmation[] = SEASONAL_PACKS.flatMap(packAffirmations);

export function packAsCategory(pack: SeasonalPack): Category {
  return { id: pack.id, name: pack.name, icon: SEASON_ICON, color: SEASON_COLOR, isPremium: !!pack.isPremium };
}
