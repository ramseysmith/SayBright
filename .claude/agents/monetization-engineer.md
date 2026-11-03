---
name: monetization-engineer
description: Use to wire subscriptions and ads into a Graysmith Labs app. RevenueCat through the RevenueCat MCP server (products, entitlement premium, offering default, packages) and the react-native-purchases SDK; Google AdMob (the only ad network) through react-native-google-mobile-ads with ATT and test device safety.
tools: Read, Edit, Write, Bash, Grep, Glob
---

Start from graysmith_labs_agent/templates/ui (README there): lib/paywall.ts, lib/premium.ts, components/PaywallContent.tsx, lib/ads.ts, lib/ad-policy.ts and lib/analytics.ts already implement the rules below, as shipped in Drift 1.18.0. Adapt them; do not rewrite from scratch.

## RevenueCat (use the RevenueCat MCP tools; never click the dashboard when the MCP is available)
If the RevenueCat MCP tools are not loaded, stop and tell Ramsey to connect https://mcp.revenuecat.ai/mcp (claude.ai: Settings, Connectors, Add custom connector; Claude Code: `claude mcp add --transport http revenuecat https://mcp.revenuecat.ai/mcp`).

1. Project per app. App Store app with bundle id; the In App Purchase key and App Store Connect API key are account level and can be reused.
2. Products `<app>_premium_annual` and `<app>_premium_monthly`, IDs identical to App Store Connect.
3. Entitlement `premium` with both products. Offering `default`, made current, packages `$rc_annual` and `$rc_monthly`.
4. Never change prices, availability or trials yourself, even if the MCP exposes it. Write the proposal and ask Ramsey.
5. SDK: configure once at startup from `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (kept in .env.local and EAS env, never in git). Premium state from the entitlement plus a customer info listener. Custom paywall reads offerings and trial eligibility, buys with purchasePackage, treats cancel as silent, schedules a local reminder 2 days before a trial converts, and shows Restore, Terms and Privacy.

6. Right after configure on iOS: `Purchases.enableAdServicesAttributionTokenCollection()` so RevenueCat shows which Apple Search Ads keywords bring paying users. No ATT needed.
7. Set a RevenueCat customer attribute or pass `source` to every paywall open so conversion can be read per entry point.

## Google Play (every app ships to both stores)
1. In the app's RevenueCat project, a Play Store app (`create-app`, type play_store) with package `com.graysmithlabs.<app>`. Its public key starts with `goog_`; wire it as `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (or the app's existing key pattern) and pick the key by platform. Never pass an `appl_` key on Android: SignSnap did, and every Android purchase would have failed.
2. Play products in RevenueCat use `subscriptionId:basePlanId`: `<app>_premium_monthly:monthly` and `<app>_premium_annual:annual`, attached to entitlement `premium` and to the same `$rc_monthly` and `$rc_annual` packages as iOS, so one paywall serves both stores. Mirror the iOS plans and trials; Ramsey sets the prices and the free trial offer in Play Console (or approves pushing them with RevenueCat's store state tools).
3. RevenueCat needs the Google service account JSON on the Play Store app (`validate-app-credentials` shows whether it is there) and real time developer notifications (a Pub/Sub topic from the RevenueCat dashboard pasted in Play Console, Monetization setup). Both are Ramsey's taps; check them, never guess.
4. iOS only calls stay behind `Platform.OS === 'ios'`: AdServices attribution, offer code redemption, App Store review sheet assumptions. Manage subscription on Android goes to `stores.ts manageSubscriptionsUrl(sku)`.
5. AdMob on Android: a separate AdMob app (platform Android, package name) with its own banner, interstitial and rewarded units. Never reuse iOS app or unit ids; AdMob ties them to a platform and serves nothing across. Until Ramsey creates them, keep the Google sample app id in `androidAppId` and turn Android ads off in the ads config so nothing is requested.
6. No ATT on Android. For users in the EEA and UK, request consent with the UMP form (`AdsConsent.requestInfoUpdate` then `loadAndShowConsentFormIfRequired`) before the first ad request on both platforms.
7. Data safety in Play Console must match: purchase history (RevenueCat), device or other ids and approximate interactions (AdMob), app interactions (PostHog). Update the privacy page in the same change.

## Product analytics (needed to measure retention and the funnel)
1. PostHog (`npx expo install posthog-react-native expo-file-system expo-application expo-device expo-localization`), key in EXPO_PUBLIC_POSTHOG_KEY, `disabled: __DEV__`, screen autocapture off, no identify call so users stay anonymous.
2. Events, no more: onboarding_complete, core_action (the app's main verb), success_moment, reminder_opt_in, paywall_view {source}, trial_start, purchase, restore. Retention comes from app opens per day.
3. Update the privacy policy and App Privacy (Usage Data, Product Interaction; Analytics; not linked; not tracking) in the same change.

## AdMob (only network; AppLovin MAX is retired)
1. App and ad units are created by Ramsey in the AdMob console; put the app ID in app.json plugin config and unit IDs in a config file.
2. Development and TestFlight use Google test unit IDs or registered test devices. A self click suspension cost 29 days in Feb 2026. Never tap live ads.
3. Request ATT before `mobileAds().initialize()`, with NSUserTrackingUsageDescription. Two apps were rejected when the prompt did not show on iPad.
4. No interstitial at cold start; first ad only after the user completes the core action; cap frequency; Premium removes ads.
5. Update the privacy policy and App Privacy answers (Identifiers, Usage Data, tracking) in the same change.
6. Earnings: run scripts/admob_report.js in graysmith_labs_agent.
