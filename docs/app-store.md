# SayBright App Store notes

## Promotional text rotation

Promotional text changes without review. Each line below is under 170
characters and leads with the free week, which applies to eligible new
subscribers on both the monthly and annual plans. Rotate one every two weeks and
log the swap in experiments.md.

Live now (Oct 15 2026):

> Try Premium free for 7 days. Every plan starts with a free week for eligible new subscribers: all 10 categories, widgets and affirmations recorded in your own voice.

Variant A, own voice angle:

> Your first week of Premium is free for eligible new subscribers. Record affirmations in your own voice and hear the words that move you most, every day.

Variant B, widget angle:

> Start with a free week of Premium for eligible new subscribers. Put a daily affirmation on your home screen and lock screen and grow your streak one day at a time.

Variant C, after 1.2.0 is live only (mentions the trial reminder, which ships in 1.2.0):

> Premium starts with a free week for eligible new subscribers, and SayBright reminds you two days before it ends. Over 340 affirmations, 10 categories, your voice.

## Analytics (Oct 16 2026)

src/services/analytics.ts now also sends the portfolio event list to PostHog (onboarding_complete, core_action for a viewed affirmation, success_moment for a favorite, share, recording, own affirmation or streak milestone, reminder_opt_in, paywall_view with the screen that opened it, trial_start, purchase, restore), only when a build carries the EAS variable EXPO_PUBLIC_POSTHOG_KEY. Only labels leave the device, never affirmation text, ids or recordings. The privacy policy already describes it. In the same submission as the first build with the key, add in App Store Connect, App Privacy, the data type Product Interaction, purpose Analytics, linked to identity No, used for tracking No.

## 1.3.0 refresh (Oct 18 2026)

* This is the first build that carries the PostHog key, so the App Privacy answer above (Product Interaction, Analytics, not linked, not tracking) must be set before 1.3.0 is submitted.
* Ads now request personalized ads only when the person allows tracking in the ATT prompt, which is asked after onboarding. The existing App Privacy answers for AdMob (Device ID and Advertising Data used for tracking, Third Party Advertising) already cover this; nothing new to set.
* Listing: new screenshots (6.9 inch only, from `npm run screenshots`), URLs on graysmithlabs.com, Apple's standard EULA as Terms, copyright Graysmith Labs LLC. Paywall review shot: store/paywall-review.png.
* New native code: react-native-svg and the expo-splash-screen config, so 1.3.0 needs a full build, not an over the air update.

## Promotional text rotation (Oct 27 2026, with 1.3.1)

Live with 1.3.1:

> Start each day on your own side with five kind affirmations to say out loud. Premium starts with a free week for eligible new subscribers: all 10 categories and no ads.

Each variant leads with the outcome, then the free week, which applies to
eligible new subscribers on both the monthly and yearly plans. Rotate one every
two weeks and log the swap in experiments.md.

Variant A, morning habit angle:

> A kinder morning in a minute or two: five affirmations a day, chosen for what you want more of. Try Premium free for a week if you are an eligible new subscriber.

Variant B, own voice angle:

> Hear kind words in your own voice. Record your favorite affirmations and play them back anytime. Premium starts with a free week for eligible new subscribers.

Variant C, confidence angle:

> Build confidence one sentence at a time. The whole Confidence category is open to everyone, and Premium starts with a free week for eligible new subscribers.
