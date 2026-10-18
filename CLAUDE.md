# SayBright

Expo managed React Native app, TypeScript. Part of the Graysmith Labs portfolio.
EAS Build and EAS Update.

For a full stack breakdown, run `/init`. This file covers the things that have
actually bitten past sessions.

## Verification: what the sandbox cannot confirm

"The code compiles" is not "the fix works". Some changes only manifest on a real
device or a live deploy, and this environment cannot confirm them. When a change
touches any of these, mark it **UNVERIFIED, requires device testing** and give a
short on device checklist instead of reporting it resolved:

* Audio: looping, loop gaps, playback timing, mixing
* Splash screen and app launch appearance
* Camera, image capture, and EXIF or crop behavior
* Haptics, push notifications, and background behavior

Past sessions shipped audio and splash fixes that looked done but were never
confirmed on device, which caused repeat iteration. Do not repeat that. Flag it.

## Build and environment preflight

Before attempting a local iOS build, check the environment in one shot rather
than retrying a blocked build:

* Correct working directory (`git rev-parse --show-toplevel`)
* Code signing certificates available
* CocoaPods installed and `pod install` has run
* Package manager: this repo uses **npm** unless a `bun.lock` appears

If any of these is missing, surface the blocker immediately and stop. Do not
burn build attempts retrying a known blocked toolchain. Prefer EAS Build when a
local native build is not set up.

Gates: `npm run typecheck` and `npm run lint` (two old warnings in
RecordingModal.tsx are known). `EXPO_OFFLINE=1 CI=1 npx expo export --platform ios`
proves the bundle.

## Git and shipping

A commit is not shipped until it is on the remote, and pushes can fail silently
on missing credentials. After committing, verify the push landed: confirm
`git status` shows the branch up to date with its upstream, not "ahead by N". If
the push failed on credentials, say the work is **local only**, name the branch,
and give the fix rather than reporting success. The `/ship` skill runs this whole
loop (gates, commit, push verify, unverified flags).

## Writing style for anything a human reads

Ramsey reads dashes as a tell that text was machine written. In release notes,
store copy, paywall copy, commit messages, and reports, use no hyphens, em
dashes, or en dashes in prose. Write compound modifiers open, for example crash
free and cross platform. Write ranges with the word to. Code, flags, and package
names keep whatever punctuation they need.

## Design: the 1.3.0 refresh is current (Oct 18 2026)

Ramsey asked for a full UI and UX refresh (HQ ui-refresh skill, Drift 1.18.0 as the
reference). Build on it; do not revert to the old gold and emoji look.

* Tokens: src/theme/colors.ts (dawn family, indigo `accent` for controls, `gold`
  only for Premium and the sun, SKIES per time of day, CATEGORY_PALETTES). New code
  imports `C`; src/constants/theme.ts COLORS only maps old names onto the tokens.
* Art: design/art/*.svg are the category glyph sources; `npm run art` regenerates
  src/components/art/CategoryIcon.tsx. BrightMark (bubble and sun, as in
  design/icon/icon.svg) and SunriseHero (one hero per screen) live beside it. The
  icon is design/icon/icon.svg rendered to assets/icon.png (opaque 1024).
* Splash: native still assets/splash-icon.png (design/splash/splash.svg) 200 points
  wide on #FF9A6B (C.splash), then src/components/AnimatedSplash.tsx, under 1.5 s.
  Splash, haptics and notifications stay UNVERIFIED until seen on device.
* Product rules (src/lib/free-tier.ts): free is 5 affirmations a day on Today, the
  Confidence category fully open, a 3 item preview of every other category ending
  on the paywall (source preview). Writing your own affirmations stays free for
  everyone (it always was). Premium: all categories, no limit, widgets, voice
  recordings, no ads. Nothing that was free before 1.3.0 moved behind Premium, so
  there is no legacy access flag.
* Ads: interstitials only through `maybeShowInterstitial` (src/lib/ad-policy.ts):
  never before a finished daily set, one per session, not in the first two
  minutes. ATT is asked after onboarding; ads are personalized only when allowed.
  The banner takes no space until it loads.
* One paywall: src/components/paywall/PaywallView.tsx (route /paywall and the last
  onboarding step, embedded with "Not now"). Headlines per source.
* Screenshots: `npm run screenshots` (scripts/screenshots, scenes.json) writes
  store/screenshots/6.9-inch and 6.1-inch (both are required; EAS Metadata
  only replaces listed sizes) and store/paywall-review.png. iPhone only. The web
  export uses web-stubs/ through metro.config.js for native only modules.

## Scope

Outside a requested refresh, for UI and UX changes prefer the smallest change that fixes the issue. Do not
redesign surrounding components or expand scope without confirming first. A past
auto capture camera redesign was rejected as too much and had to be reverted.

## Graysmith Labs HQ

Portfolio rules, the living plan and the nightly numbers live in
ramseysmith/graysmith_labs_agent (PLAN.md, CLAUDE.md, data/latest.json).
* The guard hook in .claude/hooks blocks commits not authored as Ramsey Graysmith,
  attribution trailers, claude/ branches and Google test ad IDs outside __DEV__,
  and checks store.config.json limits and dashes on every edit.
* Listing copy lives in store.config.json. If it is missing, run the Store listing
  pull workflow once. Merging a listing change to the default branch publishes it
  through store-push.yml.
* Subagents in .claude/agents: aso-copywriter, release-auditor, ux-reviewer,
  screenshot-producer, monetization-engineer, growth-analyst, illustrator. Run release-auditor
  before any build meant for review.
* The subagents, the guard hook, its settings and this section are synced from HQ
  (listed in .claude/synced.json). Change them in HQ templates/app and run
  `node scripts/claude_assets.mjs sync` there, or the next sync overwrites the edit.
* Agents merge their own reviewed work. Prices, trials, products, spend and
  account settings are Ramsey's; write him exact steps instead.
