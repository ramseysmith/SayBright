# SayBright ASO notes

## Oct 15 2026 sprint

Why: last 7 days had 17 impressions, 0 page views, 0 installs. The listing was
titled just "SayBright" with subtitle "Daily Affirmations", so the brand word
carried the title and the keyword field wasted space on "affirmations" (already
indexed from the subtitle) and multi word phrases with spaces. Search visibility
is the problem, so this sprint moves the primary phrase into the title and frees
the subtitle and keywords for new terms.

### Competitors for "daily affirmations" and "positive affirmations"

Sources: App Store pages and third party trackers (AppGoblin, Grand Screen,
Kimola, Marlvel), read Oct 15 2026. Rating counts vary by source and storefront.

| App | Title | Subtitle | Ratings | Price |
| --- | --- | --- | --- | --- |
| I am (Monkey Taps) | I am: Daily Affirmations | not shown on the pages read | about 735K (US page) to 1.1M (appgoblin), 4.8 | Free with ads; Premium about $14.99 a month, $59.99 a year, $149.99 lifetime; 3 day trial per a user review |
| Motivation (Monkey Taps) | Motivation: Daily quotes | Inspirational positive widgets | 1.1M to 1.7M, 4.8 | Free with ads; IAP $3.99 to $99.99 |
| ThinkUp (Precise Wellness) | ThinkUp: Daily Affirmations app | not shown on the pages read | 9.7K, 4.7 | Free with ads; free tier limited to 3 recorded affirmations |
| Shine (Firefrone) | Shine: Daily Affirmations | Positivity & Mindset Booster | too few to show | Free with weekly subscription |
| Motivation: daily Peptalk | Motivation: daily Peptalk | not shown | about 43K, 4.9 | Subscription |

Common 1 to 3 star complaints across these apps:

* Billing and trials: charged for a year after canceling inside a 3 day trial;
  double charges after switching plans; users want clearer pricing.
* Aggressive paywalls: content blocked after a very short trial.
* Too many ads in the free version.
* Repetitive or generic affirmations over time.
* Glitches after updates, including streak counters resetting.
* Notifications that cannot be customized.

### Gaps SayBright can own

* Everyone leads with "Daily Affirmations"; nobody uses "Positive Thinking" or
  "Self Love" in the subtitle, so those phrases are open.
* ThinkUp owns the own voice angle but caps free recordings. SayBright offers
  recording in your own voice with Premium plus writing your own for free.
* Trial anxiety is the loudest complaint. A 7 day trial (longer than I am's 3
  days) with a reminder two days before it ends answers it directly.
* SayBright's Premium price is far below I am and Motivation.

### Keyword plan

Primary phrase: **daily affirmations** (in the title).

Supporting terms: positive thinking, self love (subtitle), then keywords:
motivation, mindset, gratitude, confidence, manifest, quote, widget, esteem
(self esteem), care (self care), anxiety, calm, voice, mantra (99 characters).

Next in line if a term underperforms: inspiration, morning, reminder,
abundance, happiness.

Apple combines words across title, subtitle and keywords, so "self esteem",
"self care", "positive quote", "daily motivation", "anxiety affirmations",
"affirmations widget" and "positive mantra" are all covered without
repeating a word. "Affirmation" is left out of keywords because the title
already indexes it.

### Listing as written

* Title: SayBright: Daily Affirmations (29)
* Subtitle: Positive Thinking & Self Love (29)
* Keywords: see store.config.json, counted in the sprint log
* Check on Oct 29 2026: impressions and page views for the 14 days after the
  listing goes live versus 17 impressions and 0 page views for Oct 8 to 15.

## Oct 27 2026 sprint

Why: last 7 days had 660 impressions, 22 page views and 0 installs. On Oct 15
the same week had 17 impressions, so the title and keyword rewrite fixed search.
The loss is now on the product page: page views to installs is 0 of 22.

### Fresh look at competitors

Sources: App Store page trackers (Appaloosa Scout, AppFollow) read Oct 27 2026.
I am still leads with "Daily Affirmations" in the title and its description
opens on a pain line (negative thoughts on repeat) before the promise. ThinkUp
is still titled "ThinkUp: Daily Affirmations app". Nothing new found on Shine or
Motivation since Oct 15. The search pass was thin; the Oct 15 table stands.

### Findings

* Search is no longer the bottleneck; the first screen of the page is. The
  subtitle and promo text are the only words read before a tap on Get.
* "Positive Thinking & Self Love" names topics, not what a person gets.
* The promo text opened on "New look", which tells a stranger nothing.
* Keyword "calm" is also a competitor brand (Calm), which our rules forbid.

### Decisions

* Subtitle: "Grow Self Love, Think Positive" (30). An outcome in plain words
  that keeps self, love and positive in the subtitle.
* Keywords: "calm" out (trademark rule), "mantra" out to make room, "thinking"
  in so the phrase positive thinking is still covered across subtitle and
  keywords, "joy" in to use the last characters (100 of 100). Self love, self
  esteem and self care stay covered through "self" in the subtitle.
* Promo text leads with the outcome (start each day on your own side) and then
  the free week for eligible new subscribers.
* Description unchanged; no sentence was stale.
* Screenshots reordered to lead with the outcome: 1 today's affirmation on the
  sunrise (caption Start every day on your side), 2 hear it in your own voice,
  3 the ten categories, 4 say it out loud, 5 streak, 6 your own affirmations
  (now filled instead of an empty state). If page views to installs stays at 0
  after the check, test a first frame that shows saying it aloud.
* Check on Nov 10 2026: page views to installs for the 14 days after 1.3.1 goes
  live versus 0 of 22 for Oct 20 to 27.
