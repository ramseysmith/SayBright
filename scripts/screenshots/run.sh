#!/usr/bin/env bash
# Regenerates every App Store screenshot: npm run screenshots (Graysmith Labs kit)
# Exports the web build twice (free, and Premium for the Premium frames), then
# captures and composes. Needs Python 3 with Playwright and Pillow.
set -euo pipefail
cd "$(dirname "$0")/../.."
TMP="$(mktemp -d)"
restore() {
  if [ -f "$TMP/env.local.bak" ]; then mv "$TMP/env.local.bak" .env.local; else rm -f .env.local; fi
}
trap restore EXIT
[ -f .env.local ] && cp .env.local "$TMP/env.local.bak"

EXPO_OFFLINE=1 CI=1 npx expo export --platform web --output-dir "$TMP/web-free" --clear >/dev/null
echo "EXPO_PUBLIC_DEMO_PREMIUM=1" >> .env.local
EXPO_OFFLINE=1 CI=1 npx expo export --platform web --output-dir "$TMP/web-premium" --clear >/dev/null
restore; trap - EXIT

python3 scripts/screenshots/make.py "$TMP/web-free" "$TMP/web-premium"
rm -rf "$TMP"
