#!/usr/bin/env bash
# X media for one app: promo card + demo video (Graysmith Labs kit).
#   bash run.sh <app repo>            (from anywhere; uses bunx, falls back to npx)
# Exports the web build twice (free, and Premium for Premium scenes), then writes
# store/media/promo.jpg, store/media/demo.mp4 and store/media/demo-poster.jpg.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "${1:?usage: run.sh <app repo>}" && pwd)"
shift
cd "$REPO"
[ -f scripts/screenshots/scenes.json ] || { echo "no scripts/screenshots/scenes.json: run the screenshot-producer setup first"; exit 1; }
X=bunx; command -v bunx >/dev/null || X=npx
TMP="$(mktemp -d)"
restore() { if [ -f "$TMP/env.local.bak" ]; then mv "$TMP/env.local.bak" .env.local; else rm -f .env.local; fi; }
trap restore EXIT
[ -f .env.local ] && cp .env.local "$TMP/env.local.bak"
EXPO_OFFLINE=1 CI=1 $X expo export --platform web --output-dir "$TMP/web-free" --clear >/dev/null
echo "EXPO_PUBLIC_DEMO_PREMIUM=1" >> .env.local
EXPO_OFFLINE=1 CI=1 $X expo export --platform web --output-dir "$TMP/web-premium" --clear >/dev/null
restore; trap - EXIT
python3 "$HERE/promo_card.py" "$REPO"
python3 "$HERE/demo_video.py" "$REPO" "$TMP/web-free" "$TMP/web-premium" "$@"
rm -rf "$TMP"
