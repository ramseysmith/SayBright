---
name: screenshot-producer
description: Use to produce App Store screenshots (1320 x 2868, 6.9 inch), the iOS 27 creative assets (product page header and search results) and the paywall screenshot for subscription review, from the app's Expo web export, in the app's brand.
tools: Read, Write, Edit, Bash, Glob
---

You make store screenshots with graysmith_labs_agent/templates/ui/screenshots (make.py, run.sh, scenes.example.json). Copy them into the app repo under scripts/screenshots, add `"screenshots": "bash scripts/screenshots/run.sh"` to package.json, and fill scenes.json with the app's palette (themes, ink), seeded storage and scenes. One command then makes every frame for iPhone 6.9 inch and iPad 13 inch plus the paywall review shot. Drift is the working reference. (The older capture.py and compose.py in templates/screenshots still work for iPhone only apps.)

1. Plan six frames that tell the story: core action, the result, the payoff moment, a Premium feature, help or depth, routine or retention. Write captions of six words or fewer, no dashes.
1b. **No price anywhere in the listing frames (App Store Guideline 2.3.7).** Drift 1.18.0 was rejected for a paywall frame captioned "Your first week is free", and SayBright had the same frame. Never use the paywall (/paywall, /premium) as a listing frame, never write free, trial, price, sale, discount, $, /month or % off in a caption, and never leave an upsell chip like "Try free" or a price on screen: capture home and Premium frames from the premium build so upsells are hidden. Show Premium by what it unlocks ("Eleven sounds that loop all night"), not by what it costs. The trial goes in the description and promo text; the paywall goes only in store/paywall-review.png for subscription review. make.py fails the run and the guard hook blocks scenes.json on any of this; do not work around either.
2. Seed realistic data: write seed JSON files in the exact shape the app persists (read src/store). Use believable names and numbers, never lorem ipsum, and nothing that implies fake reviews or fake users.
3. Export web: `EXPO_OFFLINE=1 CI=1 npx expo export --platform web --output-dir <tmp>/web`. For Premium frames, add the app's web only demo flag to .env.local, export with `--clear`, then restore .env.local. Never commit the flag.
4. Capture with capture.py (viewport 440 x 956 at 3x). Reach dynamic routes by clicking. Use scrollTop steps, not the mouse wheel.
5. Compose with compose.py, alternating dark and light themes from the app's palette.
6. Look at every output image yourself before finishing, at full size, iPhone and iPad. Check for any price, free, trial or discount wording (Guideline 2.3.7), clipped text, decoration over text (a background moon behind a headline), two copies of the same illustration on one frame, empty states, a Premium row on a free frame, debug UI, a time of day that does not match the caption, orphaned last words in captions, iPad frames where the UI reads too small (capture iPad at 768 x 1024 points at 2.6875x), or a screen that no longer matches the current app. Send Ramsey the final frames, never work in progress, so what he reviews is what ships.
7. make.py writes store/screenshots/6.9-inch (1320 x 2868, slot APP_IPHONE_67) and store/screenshots/ipad-13 (2064 x 2752, slot APP_IPAD_PRO_3GEN_129) and store/paywall-review.png. List both folders under `apple.info.en-US.screenshots` in store.config.json so the store push uploads them; an app with supportsTablet true needs the iPad set. Remove stale paths: the guard hook fails a listing that points at missing or wrongly sized files. Update docs/app-store.md.

Web rendering uses Inter instead of SF and shows the web header. When TestFlight screenshots from a real iPhone are available, compose those instead.

## Google Play assets (every app with android.package)

The same `bun run screenshots` run writes the Play set, because the iPhone frames (1320 x 2868) break Play's rule that the long side be at most twice the short side:
* store/google/phone/*.png at 1080 x 2160 from a Pixel sized viewport, store/google/icon.png (512 x 512) and store/google/feature.png (1024 x 500, app icon, name and `tagline` from scenes.json). Give scenes.json a `tagline` of six words or fewer with no price, free, best or ranking words.
* Look at every Android frame: no iOS status bar or home indicator drawn by the web export, no "App Store" text, nothing clipped by the shorter canvas.
* List the files in play.config.json under `images.<lang>` (`icon`, `featureGraphic`, `phoneScreenshots`) and run `node scripts/android/play-listing.mjs --check`. Merging to main publishes them through play-listing.yml.

## Creative assets (product page header and search results, iOS 27)

Every time you make or change the listing screenshots, also make the creative assets, following HQ `.claude/skills/creative-assets/SKILL.md`:
8. With store/raw fresh from the run above, write scripts/screenshots/creative.json (a headline of seven words or fewer that names the outcome, and three scenes, centre first) and run `python3 <HQ>/templates/ui/creative/make_creative.py .`. It writes store/creative/universal.png (5244 x 2950, both placements), header.png (3840 x 1646), search.png (3840 x 2560), preview.jpg and manifest.json, and fails on a wrong size, alpha, a dash, or price, free, trial, URL, award or "best" wording. Add `--video` when store/media/demo.mp4 is current.
9. Look at preview.jpg at full size: the headline reads at phone size and both crops of the universal image keep the point. Commit store/creative/ and creative.json. The App Store Connect API cannot upload these, so the session's note gives Ramsey the three Asset Library taps from the skill.
