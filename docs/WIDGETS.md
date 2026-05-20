# SayBright iOS Widgets

SayBright ships home screen widgets (`systemSmall`, `systemMedium`, `systemLarge`) and lock screen widgets (`accessoryRectangular`, `accessoryCircular`, `accessoryInline`) for iOS 16+ via a WidgetKit extension target.

## Architecture at a glance

- **Widget extension target**: `targets/widget/` (added at prebuild time by `@bacons/apple-targets`).
- **Shared storage**: App Group `group.com.saybright.app` backed by `NSUserDefaults`.
- **JS bridge**: local Expo native module at `modules/widget-storage/` exposes `setWidgetData`, `clearWidgetData`, and `reloadWidgets`.
- **JS surface**: `src/services/widgetData.ts` mirrors the payload to AsyncStorage and pushes it through the native bridge so WidgetKit can read it.

```
JS (widgetData.ts)
   ↓
modules/widget-storage (Swift)
   ↓
NSUserDefaults(suiteName: "group.com.saybright.app")
   ↑
targets/widget (Swift WidgetKit extension)
   → home screen + lock screen widgets
```

## One time setup in Apple Developer Portal

1. Sign in at https://developer.apple.com/account/resources/identifiers/list/applicationGroup.
2. Create a new **App Group** with identifier `group.com.saybright.app`.
3. Open the **App ID** for `com.saybright.app`, enable the **App Groups** capability, and add `group.com.saybright.app`.
4. Repeat for the widget bundle id (the plugin generates it as `com.saybright.app.widget`): add an App ID and enable the same App Group.
5. Regenerate any provisioning profiles that include either bundle id (Xcode managed signing handles this automatically when you build).

## Generate the native targets

After pulling these changes for the first time, regenerate the iOS project so the widget target and entitlements are picked up:

```bash
npx expo prebuild --platform ios --clean
```

This will:
- Add the `SayBrightWidgetExtension` target driven by `targets/widget/`.
- Attach `group.com.saybright.app` to both the main app and widget entitlements files.
- Autolink the `WidgetStorage` local module from `modules/widget-storage/`.

After prebuild, open `ios/SayBright.xcworkspace` in Xcode once to verify:
- The widget target appears in the schemes dropdown.
- Both targets have App Groups capability enabled with `group.com.saybright.app` checked.
- Signing is configured for both targets.

## Building and testing

```bash
# Local dev build (TestFlight or device)
eas build --profile development --platform ios

# Production
eas build --profile production --platform ios
```

To verify on device after install:
1. Open SayBright and swipe a few affirmations so `updateWidgetData` runs.
2. Long press the home screen, tap the plus, search "SayBright", and add one of the widget sizes.
3. For lock screen: edit your lock screen, pick a widget slot, select SayBright.
4. The widget should show the affirmation visible on the Today tab and (for premium users) the current streak.

## Refresh behavior

- The Today tab calls `updateWidgetData` whenever the current affirmation, streak, or premium status changes. The native module persists the payload and calls `WidgetCenter.shared.reloadAllTimelines()` to refresh immediately.
- WidgetKit also schedules a fallback timeline reload every hour via `getTimeline`'s `.after(...)` policy.

## Free vs Premium

Free users see the placeholder copy "Upgrade to SayBright Premium for daily widget updates ✨" on the widget (the JS layer rewrites the payload before persisting). Premium users see the live affirmation, category, and streak.
