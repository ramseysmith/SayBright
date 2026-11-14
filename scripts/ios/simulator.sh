#!/usr/bin/env bash
# Drive the local iOS simulator from the terminal, the same way in every app:
#   scripts/ios/simulator.sh boot | build | install [app] | launch | shot [name]
#   scripts/ios/simulator.sh tap X Y | tap --label "Text" | type "text" | swipe X1 Y1 X2 Y2 | home
#   scripts/ios/simulator.sh ui | logs | smoke | stop
# Run it from the app repo root. Local builds only: it never starts an EAS
# cloud build. `smoke` is the iOS gate before any TestFlight build
# (ios-local-test skill). It writes build/ios-smoke.json with the git sha.
# The iOS twin of scripts/android/emulator.sh. Taps and the UI tree use AXe
# (brew install cameroncooke/axe/axe). Coordinates are points, not pixels.
# Synced from HQ (templates/app/scripts/ios). Change it there.
# Plain bash 3.2 (macOS), no GNU only tools.
set -euo pipefail

SIM_NAME="${GRAYSMITH_SIM:-graysmith_iphone}"
SIM_TYPE="${GRAYSMITH_SIM_TYPE:-iPhone 17 Pro}"
OUT_DIR="build"
SHOTS_DIR="$OUT_DIR/ios-shots"
DEFAULT_APP="$OUT_DIR/ios-sim/app.app"
SMOKE_WAIT="${SMOKE_WAIT:-20}"

say() { echo "[simulator] $*"; }
die() { echo "[simulator] ERROR: $*" >&2; exit 1; }

# ---------- environment ----------

setup_env() {
  # launchd starts jobs with no locale; CocoaPods crashes without UTF-8
  export LANG="${LANG:-en_US.UTF-8}" LC_ALL="${LC_ALL:-en_US.UTF-8}"
  command -v xcrun >/dev/null 2>&1 || die "Xcode command line tools missing. Fix: install Xcode, then xcode-select -s /Applications/Xcode.app"
  xcrun simctl help >/dev/null 2>&1 || die "simctl unavailable. Fix: open Xcode once to finish its install"
}

need_axe() {
  command -v axe >/dev/null 2>&1 || die "AXe missing (taps and the UI tree need it). Fix: brew install cameroncooke/axe/axe"
}

# UDID of the graysmith simulator, created on first use.
sim_udid() {
  xcrun simctl list devices available 2>/dev/null \
    | awk -v n="$SIM_NAME" 'index($0, "    " n " (") == 1 { match($0, /\([0-9A-F-]{36}\)/); print substr($0, RSTART + 1, 36); exit }'
}

sim_state() {
  xcrun simctl list devices 2>/dev/null | grep -F "($1)" | sed -E 's/.*\((Booted|Shutdown|Booting|Shutting Down)\).*/\1/' | head -1
}

need_sim() {
  UDID="$(sim_udid)"
  [ -n "$UDID" ] || die "No simulator named $SIM_NAME. Fix: scripts/ios/simulator.sh boot"
  [ "$(sim_state "$UDID")" = Booted ] || die "$SIM_NAME is not booted. Fix: scripts/ios/simulator.sh boot"
  export UDID
}

app_bundle_id() {
  local id=""
  if [ -f app.json ]; then
    id="$(node -e "const a=require('./app.json');process.stdout.write(((a.expo||a).ios||{}).bundleIdentifier||'')" 2>/dev/null || true)"
  fi
  if [ -z "$id" ]; then
    id="$(npx --yes expo config --type public --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).ios.bundleIdentifier||'')}catch(e){}})" || true)"
  fi
  [ -n "$id" ] || die "Could not read expo.ios.bundleIdentifier from app.json or the Expo config. Run this from the app repo root."
  echo "$id"
}

app_version() {
  node -e "try{const a=require('./app.json');process.stdout.write((a.expo||a).version||'unknown')}catch(e){process.stdout.write('unknown')}" 2>/dev/null || echo unknown
}

# The eas.json profile that builds for the simulator: ios-sim, else any
# profile with ios.simulator true (the android-sim profile sets it).
sim_profile() {
  node -e "
    try {
      const b = require('./eas.json').build || {};
      // A development client shows the dev launcher, not the app, so it can never
      // be the smoke build (Tallyhand and TubTender ios-simulator, Nov 14 2026).
      const dev = (k, seen = 0) => { const v = b[k] || {}; return !!v.developmentClient || (!!v.extends && seen < 5 && dev(v.extends, seen + 1)); };
      if (b['ios-sim'] && !dev('ios-sim')) { process.stdout.write('ios-sim'); process.exit(0); }
      for (const [k, v] of Object.entries(b)) if (v && v.ios && v.ios.simulator && !dev(k)) { process.stdout.write(k); process.exit(0); }
    } catch (e) {}
  " 2>/dev/null || true
}

# Exports a build profile's env (test ads and the like) for the fallback build.
export_profile_env() {
  local lines
  [ -n "$1" ] || return 0
  lines="$(node -e "try{const e=(require('./eas.json').build[process.argv[1]]||{}).env||{};for(const[k,v]of Object.entries(e))console.log(k+'='+v)}catch(e){}" "$1" 2>/dev/null || true)"
  if [ -n "$lines" ]; then
    while IFS= read -r kv; do
      [ -n "$kv" ] && export "$kv" && say "env ${kv%%=*}"
    done <<EOF
$lines
EOF
  fi
}

# Where the fallback native build runs: the repo, or with LOCAL_BUILD_MIRROR=1
# (HQ scripts/local_checks.sh) a copy under $TMPDIR, since macOS privacy
# protection blocks tools a launchd job starts from reading ~/Documents.
native_build_dir() {
  if [ -z "${LOCAL_BUILD_MIRROR:-}" ]; then pwd; return; fi
  local dest="${TMPDIR:-/tmp}/graysmith-build/$(basename "$PWD")"
  mkdir -p "$dest"
  rsync -a --delete --exclude /.git --exclude /build --exclude /android --exclude /ios ./ "$dest/" >&2 \
    || die "Could not copy the repo to $dest"
  echo "[simulator] Building in $dest (LOCAL_BUILD_MIRROR)" >&2
  echo "$dest"
}

# ---------- commands ----------

cmd_boot() {
  local window=0
  [ "${1:-}" = "--window" ] && window=1
  UDID="$(sim_udid)"
  if [ -z "$UDID" ]; then
    say "Creating simulator $SIM_NAME ($SIM_TYPE)"
    UDID="$(xcrun simctl create "$SIM_NAME" "$SIM_TYPE" 2>/dev/null | tail -1)"
    [ -n "$UDID" ] || die "Could not create $SIM_NAME. Fix: install an iOS runtime in Xcode, Settings, Components"
  fi
  if [ "$(sim_state "$UDID")" != Booted ]; then
    say "Booting $SIM_NAME"
    xcrun simctl boot "$UDID"
  else
    say "$SIM_NAME already booted"
  fi
  xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1 || true
  [ "$window" = 1 ] && open -a Simulator --args -CurrentDeviceUDID "$UDID"
  # A clean, stable status bar for screenshots
  xcrun simctl status_bar "$UDID" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 >/dev/null 2>&1 || true
  say "Ready: $SIM_NAME $UDID"
}

cmd_build() {
  mkdir -p "$OUT_DIR"
  local profile
  profile="$(sim_profile)"
  rm -rf "$OUT_DIR/ios-sim" "$OUT_DIR/app-ios-sim.tar.gz"
  local built=0
  if [ -z "$profile" ]; then
    say "No eas.json profile builds for the simulator (copy android-sim from HQ templates/app/eas.json); building with expo prebuild plus xcodebuild"
  elif ! command -v fastlane >/dev/null 2>&1; then
    say "fastlane missing, so eas build --local cannot build iOS (fix: brew install fastlane); building with expo prebuild plus xcodebuild"
  else
    say "Local build of profile $profile for the simulator (never a cloud build)"
    if npx --yes eas-cli build --local --non-interactive -p ios --profile "$profile" --output "$OUT_DIR/app-ios-sim.tar.gz"; then
      mkdir -p "$OUT_DIR/ios-sim"
      tar -xzf "$OUT_DIR/app-ios-sim.tar.gz" -C "$OUT_DIR/ios-sim"
      built=1
    else
      say "eas build --local failed; falling back to expo prebuild plus xcodebuild"
    fi
  fi
  if [ "$built" = 0 ]; then
    local dir derived="$PWD/$OUT_DIR/ios-derived"
    dir="$(native_build_dir)"
    (
      # set -e is off inside a subshell guarded by ||, so chain every step
      cd "$dir" && export_profile_env "$profile" && npx expo prebuild -p ios --clean || exit 1
      ws="$(ls -d ios/*.xcworkspace 2>/dev/null | head -1)"
      [ -n "$ws" ] || die "prebuild made no ios/*.xcworkspace (pod install failed? log above)"
      xcodebuild -workspace "$ws" -scheme "$(basename "$ws" .xcworkspace)" -configuration Release -sdk iphonesimulator \
        -destination 'generic/platform=iOS Simulator' -derivedDataPath "$derived" \
        CODE_SIGNING_ALLOWED=NO build > "$derived.log" 2>&1 || { tail -40 "$derived.log"; die "xcodebuild failed (full log $derived.log)"; }
      tail -5 "$derived.log"
    ) || exit 1
    mkdir -p "$OUT_DIR/ios-sim"
    cp -R "$OUT_DIR"/ios-derived/Build/Products/Release-iphonesimulator/*.app "$OUT_DIR/ios-sim/"
  fi
  local app
  app="$(ls -d "$OUT_DIR"/ios-sim/*.app 2>/dev/null | head -1 || true)"
  [ -n "$app" ] || die "Build finished without a .app in $OUT_DIR/ios-sim"
  [ "$app" = "$DEFAULT_APP" ] || { rm -rf "$DEFAULT_APP"; mv "$app" "$DEFAULT_APP"; }
  say "Built $DEFAULT_APP"
}

cmd_install() {
  need_sim
  local app="${1:-$DEFAULT_APP}"
  [ -d "$app" ] || die "No app at $app. Fix: scripts/ios/simulator.sh build"
  say "Installing $app on $SIM_NAME"
  xcrun simctl install "$UDID" "$app"
}

start_app() {
  xcrun simctl launch --terminate-running-process "$UDID" "$1" >/dev/null
}

cmd_launch() {
  need_sim
  local bid
  bid="$(app_bundle_id)"
  date -u +"%Y-%m-%d %H:%M:%S" > "$OUT_DIR/.ios-launch-time"
  say "Launching $bid"
  start_app "$bid" || die "Could not launch $bid. Is it installed? (simulator.sh install)"
}

cmd_shot() {
  need_sim
  local name="${1:-shot_$(date +%H%M%S)}"
  mkdir -p "$SHOTS_DIR"
  xcrun simctl io "$UDID" screenshot "$SHOTS_DIR/$name.png" >/dev/null 2>&1
  echo "$SHOTS_DIR/$name.png"
}

cmd_tap() {
  need_sim; need_axe
  case "${1:-}" in
    --label|--id) [ $# -ge 2 ] || die "usage: tap --label \"Text\""; axe tap "$1" "$2" --wait-timeout 5 --udid "$UDID" >/dev/null ;;
    *) [ $# -eq 2 ] || die "usage: tap X Y (points) or tap --label \"Text\""; axe tap -x "$1" -y "$2" --udid "$UDID" >/dev/null ;;
  esac
}
cmd_type() { need_sim; need_axe; [ $# -ge 1 ] || die "usage: type \"text\""; axe type "$*" --udid "$UDID" >/dev/null; }
cmd_swipe() {
  need_sim; need_axe
  [ $# -ge 4 ] || die "usage: swipe X1 Y1 X2 Y2 (points)"
  axe swipe --start-x "$1" --start-y "$2" --end-x "$3" --end-y "$4" --duration 0.3 --udid "$UDID" >/dev/null
}
cmd_home() { need_sim; need_axe; axe button home --udid "$UDID" >/dev/null; }

# Prints one line per labelled element: center x,y in points, then label,
# value, id and type, so agents tap by label (or by the printed center).
dump_ui() {
  mkdir -p "$OUT_DIR"
  axe describe-ui --udid "$UDID" > "$OUT_DIR/ios-ui.json" 2>/dev/null || return 1
  node -e '
    const tree = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    let n = 0;
    const want = process.env.APP_PID ? Number(process.env.APP_PID) : null;
    const seen = new Set();
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      const label = node.AXLabel || "", value = node.AXValue || "", id = node.AXUniqueId || "";
      if ((label || value || id) && node.type !== "Application" && (want === null || node.pid === want)) {
        const f = node.frame || {};
        const c = f.width !== undefined ? Math.round(f.x + f.width / 2) + "," + Math.round(f.y + f.height / 2) : "?";
        const parts = [];
        if (label) parts.push("label=\"" + label + "\"");
        if (value) parts.push("value=\"" + value + "\"");
        if (id) parts.push("id=" + id);
        if (node.type) parts.push("[" + node.type + "]");
        const line = c.padEnd(9) + " " + parts.join(" ");
        if (!seen.has(line)) { seen.add(line); console.log(line); n++; }
      }
      walk(node.children);
    };
    walk(tree);
    if (!n) console.log("(no labelled elements: splash, blank or black screen)");
  ' "$OUT_DIR/ios-ui.json"
}

cmd_ui() {
  need_sim; need_axe
  dump_ui || die "axe describe-ui failed (axe doctor --udid $UDID says why)"
}

# The app's executable name, for filtering the simulator log.
app_process() {
  local c
  c="$(xcrun simctl get_app_container "$UDID" "$1" 2>/dev/null || true)"
  [ -n "$c" ] && plutil -extract CFBundleExecutable raw "$c/Info.plist" 2>/dev/null || true
}

collect_logs() {
  local bid="$1" proc since
  proc="$(app_process "$bid")"
  since="$(cat "$OUT_DIR/.ios-launch-time" 2>/dev/null || true)"
  [ -n "$since" ] || since="$(date -u -v-5M +"%Y-%m-%d %H:%M:%S")"
  [ -n "$proc" ] || { echo "(app not installed)"; return 0; }
  xcrun simctl spawn "$UDID" log show --style compact --start "$since" --timezone utc \
    --predicate "process == \"$proc\" AND (subsystem == \"com.facebook.react.log\" OR messageType == error OR messageType == fault OR eventMessage CONTAINS[c] \"exception\")" 2>/dev/null || true
}

cmd_logs() {
  need_sim
  collect_logs "$(app_bundle_id)" | tail -200
}

app_pid() {
  xcrun simctl spawn "$UDID" launchctl list 2>/dev/null | awk -v b="UIKitApplication:$1" 'index($3, b) == 1 && $1 ~ /^[0-9]+$/ { print $1; exit }'
}

# True when the app is running and the screen shows a labelled element owned
# by its process (not the app switcher or Springboard).
app_has_content() {
  local pid
  pid="$(app_pid "$1")"
  [ -n "$pid" ] || return 1
  APP_PID="$pid" dump_ui > "$OUT_DIR/ios-ui.txt" 2>/dev/null || return 1
  ! grep -q '^(no labelled elements' "$OUT_DIR/ios-ui.txt" || return 1
  # The Expo dev launcher has labels too, but it is not the app.
  if grep -qE 'DEVELOPMENT SERVERS|Searching for development servers|Development Build' "$OUT_DIR/ios-ui.txt"; then
    say "This is the Expo dev launcher, not the app: build a profile without developmentClient (ios-sim)"
    return 1
  fi
}

# Answers a system permission prompt (App Tracking Transparency, notifications)
# with the declining button. The alert belongs to SpringBoard, not the app, so
# while it is up the app looks blank to app_has_content (BlitzTap, Nov 12 2026).
dismiss_system_prompt() {
  local f="$OUT_DIR/ios-ui-full.json" label
  axe describe-ui --udid "$UDID" > "$f" 2>/dev/null || return 1
  for label in "Ask App Not to Track" "Don’t Allow" "Don't Allow"; do
    if grep -qF "\"$label\"" "$f"; then
      axe tap --label "$label" --wait-timeout 2 --udid "$UDID" >/dev/null 2>&1 || continue
      say "Answered a system prompt: $label"
      sleep 1
      return 0
    fi
  done
  return 1
}

wait_for_content() {
  local bid="$1" waited=0
  while [ "$waited" -lt "$SMOKE_WAIT" ]; do
    dismiss_system_prompt || true
    if app_has_content "$bid"; then return 0; fi
    sleep 2; waited=$((waited + 2))
  done
  return 1
}

ERROR_PATTERN='Unhandled JS Exception|Invariant Violation|TypeError|ReferenceError|Terminating app|has not been registered'

cmd_smoke() {
  need_sim; need_axe
  local bid sha version failures="" log1 log2 errs
  bid="$(app_bundle_id)"
  sha="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  version="$(app_version)"
  mkdir -p "$SHOTS_DIR"
  log1="$OUT_DIR/ios-smoke-cold.log"; log2="$OUT_DIR/ios-smoke-resume.log"
  say "Smoke test $bid $version at $sha"

  xcrun simctl terminate "$UDID" "$bid" >/dev/null 2>&1 || true
  cmd_launch
  if wait_for_content "$bid"; then say "Cold start: content on screen"; else failures="$failures cold_start_stuck"; say "Cold start: still splash, blank or not running after ${SMOKE_WAIT} s"; fi
  cmd_shot smoke_cold >/dev/null
  collect_logs "$bid" > "$log1"
  errs="$(grep -E "$ERROR_PATTERN" "$log1" || true)"
  if [ -n "$errs" ]; then failures="$failures cold_errors"; say "Errors in cold start log:"; echo "$errs" | head -20; fi

  say "Background (open Settings), then relaunch"
  xcrun simctl launch "$UDID" com.apple.Preferences >/dev/null 2>&1 || true
  sleep 3
  date -u +"%Y-%m-%d %H:%M:%S" > "$OUT_DIR/.ios-launch-time"
  xcrun simctl launch "$UDID" "$bid" >/dev/null 2>&1 || true
  if wait_for_content "$bid"; then say "Relaunch: content on screen"; else failures="$failures relaunch_blank"; say "Relaunch: blank or splash after ${SMOKE_WAIT} s"; fi
  cmd_shot smoke_resume >/dev/null
  collect_logs "$bid" > "$log2"
  errs="$(grep -E "$ERROR_PATTERN" "$log2" || true)"
  if [ -n "$errs" ]; then failures="$failures resume_errors"; say "Errors in relaunch log:"; echo "$errs" | head -20; fi

  local result=pass
  [ -n "$failures" ] && result=fail
  cat > "$OUT_DIR/ios-smoke.json" <<EOF
{"result":"$result","sha":"$sha","version":"$version","bundleId":"$bid","simulator":"$SIM_NAME","date":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","failures":"${failures# }","shots":"$SHOTS_DIR"}
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
  UDID="$(sim_udid)"
  [ -n "$UDID" ] || { say "No simulator named $SIM_NAME"; return 0; }
  xcrun simctl shutdown "$UDID" >/dev/null 2>&1 || true
  say "Stopped $SIM_NAME"
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
  mkdir -p "$OUT_DIR"
  case "$cmd" in
    boot) cmd_boot "$@" ;;
    build) cmd_build "$@" ;;
    install) cmd_install "$@" ;;
    launch) cmd_launch "$@" ;;
    shot) cmd_shot "$@" ;;
    tap) cmd_tap "$@" ;;
    type) cmd_type "$@" ;;
    swipe) cmd_swipe "$@" ;;
    home) cmd_home "$@" ;;
    ui) cmd_ui "$@" ;;
    logs) cmd_logs "$@" ;;
    smoke) cmd_smoke "$@" ;;
    stop) cmd_stop "$@" ;;
    -h|--help|help) usage 0 ;;
    *) echo "Unknown command: $cmd" >&2; usage 1 ;;
  esac
}

main "$@"
