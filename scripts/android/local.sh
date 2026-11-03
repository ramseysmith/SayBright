#!/usr/bin/env bash
# Run the app on the Android emulator on this Mac. No cloud emulator, no Play upload.
#
#   npm run android:local            build on this Mac, boot the emulator, install, launch,
#                                    then a crash check and a screenshot
#   npm run android:local -- run     install and launch the last build again (no rebuild)
#   npm run android:local -- shot    screenshot the emulator now
#   npm run android:local -- logs    crash and error lines from the app since launch
#   npm run android:local -- stop    shut the emulator down
#
# Builds with `eas build --local` and the android-sim profile, so it is the same
# release style APK EAS would make (real JS bundle, no dev menu, no Metro), built
# by the Android SDK and JDK that Android Studio installed. Output and
# screenshots go to ~/graysmith-android/<app>/ so the repo stays clean.
# Synced from HQ (templates/app/scripts/android). Change it there.
set -euo pipefail
cd "$(dirname "$0")/../.."

MODE="${1:-check}"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ ! -d "$ANDROID_HOME/platform-tools" ]; then
  echo "No Android SDK at $ANDROID_HOME. Open Android Studio once (More Actions, SDK Manager) and install it."
  exit 1
fi
if [ -z "${JAVA_HOME:-}" ]; then
  for j in "/Applications/Android Studio.app/Contents/jbr/Contents/Home" "$HOME/Applications/Android Studio.app/Contents/jbr/Contents/Home"; do
    [ -d "$j" ] && export JAVA_HOME="$j" && break
  done
  if [ -z "${JAVA_HOME:-}" ]; then
    j=$(ls -d "$HOME"/.jdks/*/Contents/Home "$HOME"/.jdks/* 2>/dev/null | sort -V | tail -1 || true)
    [ -n "$j" ] && export JAVA_HOME="$j"
  fi
fi
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:${JAVA_HOME:+$JAVA_HOME/bin:}$PATH"

PKG=$(node -e "
  try { const c = require('@expo/config').getConfig(process.cwd(), { skipSDKVersionRequirement: true }).exp; console.log(c.android.package) }
  catch { console.log(require('./app.json').expo.android.package) }" 2>/dev/null)
SLUG=$(basename "$PWD")
OUT="$HOME/graysmith-android/$SLUG"
APK="$OUT/app.apk"
mkdir -p "$OUT"

emulator_serial() { adb devices | awk '/^emulator-/{print $1; exit}'; }

boot() {
  if [ -n "$(emulator_serial)" ]; then return; fi
  AVD=$(emulator -list-avds | grep -m1 -i "pixel_9" || emulator -list-avds | head -1)
  if [ -z "$AVD" ]; then
    echo "No emulator yet. Android Studio, Device Manager, Create Virtual Device, Pixel 9, API 36."
    exit 1
  fi
  echo "Booting $AVD"
  nohup emulator -avd "$AVD" -no-snapshot-save -no-boot-anim >/dev/null 2>&1 &
  adb wait-for-device
  until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
  adb shell input keyevent 82 >/dev/null 2>&1 || true
}

build() {
  echo "Building $PKG on this Mac (first build takes several minutes)"
  # Not --non-interactive: the first build of a new package asks once to create its Android keystore in EAS.
  npx --yes eas-cli@latest build --local --platform android --profile android-sim --output "$APK"
}

launch() {
  adb install -r "$APK" >/dev/null
  adb logcat -c
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  echo "Launched $PKG"
}

shot() {
  local f="$OUT/$(date +%H%M%S).png"
  adb exec-out screencap -p > "$f"
  echo "Screenshot: $f"
}

logs() {
  adb logcat -d -b crash
  adb logcat -d '*:E' | grep -E "ReactNative|AndroidRuntime|FATAL|$PKG" | tail -60 || true
}

check() {
  sleep 12
  local pid
  pid=$(adb shell pidof "$PKG" 2>/dev/null | tr -d '\r' || true)
  local crashes
  crashes=$(adb logcat -d -b crash | grep -c "FATAL EXCEPTION" || true)
  local jserr
  jserr=$(adb logcat -d '*:E' | grep -cE "ReactNativeJS|Unhandled JS Exception|TypeError|ReferenceError" || true)
  shot
  if [ -z "$pid" ] || [ "$crashes" != "0" ]; then
    echo "FAIL: $PKG is not running after launch (crash entries: $crashes). npm run android:local -- logs"
    exit 1
  fi
  if [ "$jserr" != "0" ]; then
    echo "WARN: $jserr JavaScript error lines in the log. npm run android:local -- logs"
  fi
  echo "PASS: $PKG launched and is still running."
}

case "$MODE" in
  check) boot; build; launch; check ;;
  run) boot; launch; check ;;
  shot) shot ;;
  logs) logs ;;
  stop) adb emu kill >/dev/null 2>&1 || true; echo "Emulator stopped" ;;
  *) echo "Usage: npm run android:local [-- run|shot|logs|stop]"; exit 1 ;;
esac
