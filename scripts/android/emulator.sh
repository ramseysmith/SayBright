#!/usr/bin/env bash
# Drive the local Android emulator from the terminal, the same way in every app:
#   scripts/android/emulator.sh boot | build | install [apk] | launch | shot [name]
#   scripts/android/emulator.sh tap X Y | type "text" | key BACK|HOME|ENTER | swipe X1 Y1 X2 Y2
#   scripts/android/emulator.sh ui | logs | smoke | stop | devices
# A phone over USB: ANDROID_SERIAL=phone (first USB device) or its serial, e.g.
#   ANDROID_SERIAL=phone scripts/android/emulator.sh logs
# Run it from the app repo root. Local builds only: it never starts an EAS
# cloud build. `smoke` is the gate before any Android EAS build or Play upload
# (android-local-test skill). It writes build/android-smoke.json with the git
# sha so the android-auditor can check the gate.
# Synced from HQ (templates/app/scripts/android). Change it there.
# Plain bash 3.2 (macOS), no GNU only tools.
set -euo pipefail

AVD="${GRAYSMITH_AVD:-graysmith_pixel}"
OUT_DIR="build"
SHOTS_DIR="$OUT_DIR/shots"
DEFAULT_APK="$OUT_DIR/app-sim.apk"
SMOKE_WAIT="${SMOKE_WAIT:-20}"

say() { echo "[emulator] $*"; }
die() { echo "[emulator] ERROR: $*" >&2; exit 1; }

# ---------- environment ----------

setup_env() {
  # launchd starts jobs with no locale; Gradle and CocoaPods need UTF-8
  export LANG="${LANG:-en_US.UTF-8}" LC_ALL="${LC_ALL:-en_US.UTF-8}"
  if [ -z "${ANDROID_HOME:-}" ]; then
    if [ -n "${ANDROID_SDK_ROOT:-}" ]; then ANDROID_HOME="$ANDROID_SDK_ROOT"; else ANDROID_HOME="$HOME/Library/Android/sdk"; fi
  fi
  export ANDROID_HOME
  [ -d "$ANDROID_HOME" ] || die "No Android SDK at $ANDROID_HOME. Fix: install it (Part 1 of docs/android.md, Local Android testing in HQ) and set ANDROID_HOME."
  export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
  command -v adb >/dev/null 2>&1 || die "adb missing. Fix: sdkmanager \"platform-tools\""
  command -v emulator >/dev/null 2>&1 || die "emulator missing. Fix: sdkmanager \"emulator\""
  if [ -z "${JAVA_HOME:-}" ] || [ ! -x "${JAVA_HOME}/bin/java" ]; then
    local brew17="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
    if [ -x "$brew17/bin/java" ]; then JAVA_HOME="$brew17"
    elif /usr/libexec/java_home -v 17 >/dev/null 2>&1; then JAVA_HOME="$(/usr/libexec/java_home -v 17)"
    fi
    export JAVA_HOME="${JAVA_HOME:-}"
  fi
}

# The running emulator's serial. A phone plugged in over USB would make plain
# adb refuse to choose, so every adb call targets the emulator explicitly.
emu_serial() {
  adb devices 2>/dev/null | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1; exit }'
}

phone_serial() {
  adb devices 2>/dev/null | awk 'NR > 1 && $1 != "" && $1 !~ /^emulator-/ { print $1; exit }'
}

# Picks the target: ANDROID_SERIAL when set (a serial, or "phone" for the first
# USB device), otherwise the running emulator.
need_device() {
  local s state
  if [ -n "${ANDROID_SERIAL:-}" ]; then
    s="$ANDROID_SERIAL"
    [ "$s" = phone ] && s="$(phone_serial)"
    [ -n "$s" ] || die "No phone over USB. Plug it in with USB debugging on (scripts/android/emulator.sh devices)"
    state="$(adb devices 2>/dev/null | awk -v s="$s" '$1 == s { print $2 }')"
    case "$state" in
      device) ;;
      unauthorized) die "$s is unauthorized. Unlock the phone and tap Allow USB debugging (tick Always allow), then run this again" ;;
      "") die "$s is not attached (scripts/android/emulator.sh devices)" ;;
      *) die "$s is $state, not ready" ;;
    esac
  else
    s="$(emu_serial)"
    [ -n "$s" ] || die "No emulator running. Fix: scripts/android/emulator.sh boot"
  fi
  export ANDROID_SERIAL="$s"
}

cmd_devices() {
  adb devices -l | sed 1d | awk 'NF { print }'
}

app_package() {
  local pkg=""
  if [ -f app.json ]; then
    pkg="$(node -e "const a=require('./app.json');process.stdout.write(((a.expo||a).android||{}).package||'')" 2>/dev/null || true)"
  fi
  if [ -z "$pkg" ]; then
    pkg="$(npx --yes expo config --type public --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).android.package||'')}catch(e){}})" || true)"
  fi
  [ -n "$pkg" ] || die "Could not read expo.android.package from app.json or the Expo config. Run this from the app repo root."
  echo "$pkg"
}

app_version() {
  node -e "try{const a=require('./app.json');process.stdout.write((a.expo||a).version||'unknown')}catch(e){process.stdout.write('unknown')}" 2>/dev/null || echo unknown
}

# ---------- commands ----------

cmd_boot() {
  local window=0
  [ "${1:-}" = "--window" ] && window=1
  case "${ANDROID_SERIAL:-}" in ""|emulator-*) ;; *) say "ANDROID_SERIAL is a phone; nothing to boot"; need_device; return 0 ;; esac
  if [ -n "$(emu_serial)" ]; then
    say "Emulator already running: $(emu_serial)"
  else
    emulator -list-avds | grep -qx "$AVD" || die "No AVD named $AVD. Fix: avdmanager create avd -n $AVD -k \"system-images;android-36.1;google_apis;arm64-v8a\" -d pixel_7 (see HQ docs/android.md, Local Android testing)"
    mkdir -p "$OUT_DIR"
    local flags="-no-snapshot-save -no-audio -no-boot-anim"
    [ "$window" = 1 ] || flags="$flags -no-window"
    say "Starting $AVD ($([ "$window" = 1 ] && echo window || echo headless))"
    # shellcheck disable=SC2086
    nohup emulator -avd "$AVD" $flags > "$OUT_DIR/emulator.log" 2>&1 &
    local i=0
    while [ -z "$(emu_serial)" ]; do
      i=$((i + 1)); [ "$i" -gt 90 ] && die "Emulator did not appear in adb after 180 s. See $OUT_DIR/emulator.log"
      sleep 2
    done
  fi
  need_device
  say "Waiting for boot to complete on $ANDROID_SERIAL"
  local i=0
  while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
    i=$((i + 1)); [ "$i" -gt 150 ] && die "Boot did not complete in 300 s"
    sleep 2
  done
  adb shell input keyevent 224 >/dev/null 2>&1 || true   # wake
  adb shell wm dismiss-keyguard >/dev/null 2>&1 || true
  adb shell input keyevent 3 >/dev/null 2>&1 || true     # home, closes any launcher popup
  adb shell settings put global window_animation_scale 0
  adb shell settings put global transition_animation_scale 0
  adb shell settings put global animator_duration_scale 0
  say "Ready: $ANDROID_SERIAL ($AVD), animations off"
}

# Exports the env block of the android-sim profile so the Gradle fallback
# builds with the same settings (test ads) as the EAS local build.
has_profile() {
  node -e "process.exit((require('./eas.json').build||{})[process.argv[1]]?0:1)" "$1" 2>/dev/null
}

# Where the fallback native build runs. Normally the repo itself. With
# LOCAL_BUILD_MIRROR=1 (set by HQ scripts/local_checks.sh) it is a copy under
# $TMPDIR: macOS privacy protection lets a launchd job's bash read ~/Documents
# but not the Java it starts ("Unable to access jarfile"). eas build --local
# already builds in a temp copy, which is why it never hit this.
native_build_dir() {
  if [ -z "${LOCAL_BUILD_MIRROR:-}" ]; then pwd; return; fi
  local dest="${TMPDIR:-/tmp}/graysmith-build/$(basename "$PWD")"
  mkdir -p "$dest"
  rsync -a --delete --exclude .git --exclude build --exclude android --exclude ios ./ "$dest/" >&2 \
    || die "Could not copy the repo to $dest"
  echo "[emulator] Building in $dest (LOCAL_BUILD_MIRROR)" >&2
  echo "$dest"
}

export_sim_env() {
  local lines
  lines="$(node -e "try{const e=(require('./eas.json').build['android-sim']||{}).env||{};for(const[k,v]of Object.entries(e))console.log(k+'='+v)}catch(e){}" 2>/dev/null || true)"
  if [ -n "$lines" ]; then
    while IFS= read -r kv; do
      [ -n "$kv" ] && export "$kv" && say "env ${kv%%=*}"
    done <<EOF
$lines
EOF
  fi
}

cmd_build() {
  mkdir -p "$OUT_DIR"
  [ -n "${JAVA_HOME:-}" ] || die "No JDK 17. Fix: brew install openjdk@17"
  # Gradle's default 512 MB metaspace runs out on Expo apps (expo-updates ksp).
  # The user level file overrides the generated project's gradle.properties.
  if ! grep -q '^org.gradle.jvmargs' "$HOME/.gradle/gradle.properties" 2>/dev/null; then
    mkdir -p "$HOME/.gradle"
    echo 'org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2g -Dfile.encoding=UTF-8' >> "$HOME/.gradle/gradle.properties"
    say "Raised Gradle memory in ~/.gradle/gradle.properties"
  fi
  # The emulator is arm64; building one ABI instead of four halves the time.
  export ORG_GRADLE_PROJECT_reactNativeArchitectures="${ANDROID_ABIS:-arm64-v8a}"
  if has_profile android-sim; then
    say "Local build of profile android-sim (never a cloud build), ABI $ORG_GRADLE_PROJECT_reactNativeArchitectures"
    if npx --yes eas-cli build --local --non-interactive -p android --profile android-sim --output "$DEFAULT_APK"; then
      say "Built $DEFAULT_APK"
      return 0
    fi
    say "eas build --local failed; falling back to expo prebuild plus Gradle"
  else
    say "No android-sim profile in eas.json (copy it from HQ templates/app/eas.json); building with expo prebuild plus Gradle"
  fi
  local dir apk
  dir="$(native_build_dir)"
  (
    cd "$dir"
    export_sim_env
    npx expo prebuild -p android --clean --no-install
    cd android && ./gradlew assembleRelease --console=plain
  ) || die "Gradle fallback build failed (log above)"
  apk="$(ls -t "$dir"/android/app/build/outputs/apk/release/*.apk 2>/dev/null | head -1 || true)"
  [ -n "$apk" ] || die "Gradle finished without an APK in $dir/android/app/build/outputs/apk/release"
  cp "$apk" "$DEFAULT_APK"
  say "Built $DEFAULT_APK (Gradle fallback)"
}

cmd_install() {
  need_device
  local apk="${1:-$DEFAULT_APK}"
  [ -f "$apk" ] || die "No APK at $apk. Fix: scripts/android/emulator.sh build"
  say "Installing $apk on $ANDROID_SERIAL"
  adb install -r "$apk"
}

# Starts the app's launcher activity. monkey aborts on emulators without
# hardware keys, so resolve the activity and use am start instead.
start_app() {
  local pkg="$1" act
  act="$(adb shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER "$pkg" 2>/dev/null | tr -d '\r' | tail -1)"
  case "$act" in
    */*) adb shell am start -n "$act" >/dev/null 2>&1 ;;
    *) return 1 ;;
  esac
}

cmd_launch() {
  need_device
  local pkg
  pkg="$(app_package)"
  adb logcat -c || true
  say "Launching $pkg"
  start_app "$pkg" || die "Could not launch $pkg. Is it installed? (emulator.sh install)"
}

cmd_shot() {
  need_device
  local name="${1:-shot_$(date +%H%M%S)}"
  mkdir -p "$SHOTS_DIR"
  adb exec-out screencap -p > "$SHOTS_DIR/$name.png"
  echo "$SHOTS_DIR/$name.png"
}

cmd_tap() { need_device; [ $# -eq 2 ] || die "usage: tap X Y"; adb shell input tap "$1" "$2"; }
cmd_swipe() { need_device; [ $# -ge 4 ] || die "usage: swipe X1 Y1 X2 Y2 [ms]"; adb shell input swipe "$1" "$2" "$3" "$4" "${5:-300}"; }
cmd_key() {
  need_device
  local k="${1:-}"
  case "$k" in
    BACK|back) k=4 ;; HOME|home) k=3 ;; ENTER|enter) k=66 ;; MENU|menu) k=82 ;;
    "") die "usage: key BACK|HOME|ENTER|<keycode>" ;;
  esac
  adb shell input keyevent "$k"
}
cmd_type() {
  need_device
  [ $# -ge 1 ] || die "usage: type \"text\""
  # adb input text needs spaces as %s and shell metacharacters escaped
  local t
  t="$(printf '%s' "$*" | sed -e 's/ /%s/g' -e "s/[()<>|;&*\\\\\"'\`]/\\\\&/g")"
  adb shell input text "$t"
}

# Prints one line per meaningful node: center x,y, then text, description, id.
dump_ui() {
  mkdir -p "$OUT_DIR"
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || return 1
  adb pull /sdcard/ui.xml "$OUT_DIR/ui.xml" >/dev/null 2>&1 || return 1
  node -e '
    const xml = require("fs").readFileSync(process.argv[1], "utf8");
    const un = (s) => s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,"\"").replace(/&#10;/g," ");
    const re = /<node\b([^>]*)>/g; let m; let n = 0;
    while ((m = re.exec(xml))) {
      const a = {}; m[1].replace(/([\w-]+)="([^"]*)"/g, (_, k, v) => { a[k] = un(v); });
      const text = a.text || "", desc = a["content-desc"] || "", id = (a["resource-id"] || "").replace(/^.*:id\//, "");
      const click = a.clickable === "true";
      if (!text && !desc && !(id && click)) continue;
      const b = (a.bounds || "").match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      const c = b ? Math.round((+b[1] + +b[3]) / 2) + "," + Math.round((+b[2] + +b[4]) / 2) : "?";
      const parts = [];
      if (text) parts.push("text=\"" + text + "\"");
      if (desc) parts.push("desc=\"" + desc + "\"");
      if (id) parts.push("id=" + id);
      if (click) parts.push("[tap]");
      console.log(c.padEnd(10) + " " + parts.join(" "));
      n++;
    }
    if (!n) console.log("(no labelled nodes: splash, blank or black screen)");
  ' "$OUT_DIR/ui.xml"
}

cmd_ui() {
  need_device
  dump_ui || die "uiautomator dump failed (the screen may be animating; try again)"
}

LOG_PATTERN='ReactNativeJS|ReactNative|AndroidRuntime|FATAL|Expo|TrackPlayer|Purchases|Ads'

cmd_logs() {
  need_device
  local pkg
  pkg="$(app_package)"
  adb logcat -d 2>/dev/null | grep -E "$LOG_PATTERN|$pkg" | tail -200 || true
}

# True when the app is in front and shows at least one labelled node of its own.
app_has_content() {
  local pkg="$1"
  adb shell dumpsys window 2>/dev/null | grep -E 'mCurrentFocus|mFocusedApp' | grep -q "$pkg" || return 1
  dump_ui >/dev/null 2>&1 || return 1
  grep -o "<node [^>]*package=\"$pkg\"[^>]*>" "$OUT_DIR/ui.xml" 2>/dev/null \
    | grep -E 'text="[^"]+"|content-desc="[^"]+"' >/dev/null
}

wait_for_content() {
  local pkg="$1" waited=0
  while [ "$waited" -lt "$SMOKE_WAIT" ]; do
    if app_has_content "$pkg"; then return 0; fi
    sleep 2; waited=$((waited + 2))
  done
  return 1
}

ERROR_PATTERN='FATAL EXCEPTION|Unhandled JS Exception|Invariant Violation|TypeError|ReferenceError'

check_errors() {
  local file="$1"
  grep -E "$ERROR_PATTERN" "$file" | grep -E "ReactNativeJS|ReactNative|AndroidRuntime|$2" || true
}

cmd_smoke() {
  need_device
  local pkg sha version failures="" log1 log2 errs
  pkg="$(app_package)"
  sha="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  version="$(app_version)"
  mkdir -p "$SHOTS_DIR"
  log1="$OUT_DIR/smoke-cold-logcat.txt"; log2="$OUT_DIR/smoke-resume-logcat.txt"
  say "Smoke test $pkg $version at $sha"

  adb shell am force-stop "$pkg" || true
  cmd_launch
  if wait_for_content "$pkg"; then say "Cold start: content on screen"; else failures="$failures cold_start_stuck"; say "Cold start: still splash, blank or not in front after ${SMOKE_WAIT} s"; fi
  cmd_shot smoke_cold >/dev/null
  adb logcat -d > "$log1" 2>/dev/null || true
  errs="$(check_errors "$log1" "$pkg")"
  if [ -n "$errs" ]; then failures="$failures cold_errors"; say "Errors in cold start log:"; echo "$errs" | head -20; fi

  say "Background with HOME, then relaunch"
  adb shell input keyevent 3
  sleep 3
  adb logcat -c || true
  start_app "$pkg" || true
  if wait_for_content "$pkg"; then say "Relaunch: content on screen"; else failures="$failures relaunch_blank"; say "Relaunch: blank, black or splash after ${SMOKE_WAIT} s"; fi
  cmd_shot smoke_resume >/dev/null
  adb logcat -d > "$log2" 2>/dev/null || true
  errs="$(check_errors "$log2" "$pkg")"
  if [ -n "$errs" ]; then failures="$failures resume_errors"; say "Errors in relaunch log:"; echo "$errs" | head -20; fi

  local result=pass
  [ -n "$failures" ] && result=fail
  cat > "$OUT_DIR/android-smoke.json" <<EOF
{"result":"$result","sha":"$sha","version":"$version","package":"$pkg","target":"$ANDROID_SERIAL","avd":"$AVD","date":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","failures":"${failures# }","shots":"$SHOTS_DIR"}
EOF
  say "Screenshots: $SHOTS_DIR/smoke_cold.png $SHOTS_DIR/smoke_resume.png (Read both)"
  if [ "$result" = pass ]; then
    say "SMOKE PASS $version $sha"
  else
    say "SMOKE FAIL $version $sha:${failures}"
    say "Logs: $log1 $log2"
    exit 1
  fi
}

cmd_stop() {
  local s
  s="$(emu_serial)"
  if [ -z "$s" ]; then say "No emulator running"; return 0; fi
  adb -s "$s" emu kill
  say "Stopped $s"
}

usage() {
  sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

main() {
  local cmd="${1:-}"
  [ -n "$cmd" ] || usage 1
  shift
  setup_env
  case "$cmd" in
    boot) cmd_boot "$@" ;;
    build) cmd_build "$@" ;;
    install) cmd_install "$@" ;;
    launch) cmd_launch "$@" ;;
    shot) cmd_shot "$@" ;;
    tap) cmd_tap "$@" ;;
    type) cmd_type "$@" ;;
    key) cmd_key "$@" ;;
    swipe) cmd_swipe "$@" ;;
    ui) cmd_ui "$@" ;;
    logs) cmd_logs "$@" ;;
    smoke) cmd_smoke "$@" ;;
    stop) cmd_stop "$@" ;;
    devices) cmd_devices "$@" ;;
    -h|--help|help) usage 0 ;;
    *) echo "Unknown command: $cmd" >&2; usage 1 ;;
  esac
}

main "$@"
