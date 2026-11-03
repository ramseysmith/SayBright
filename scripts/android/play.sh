#!/usr/bin/env bash
# Build for Android in the cloud and send it to Google Play internal testing:
#   npm run build:play
# The Android twin of build:testflight. Checks the code and runs the Android
# doctor first so a build is never spent on something that would break on
# Android. Testers get it from the Play Store app within minutes; nobody
# sideloads anything.
# Synced from HQ (templates/app/scripts/android). Change it there.
set -euo pipefail
cd "$(dirname "$0")/../.."

EAS="npx --yes eas-cli@latest"

if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes. Commit or stash them first so the build matches GitHub:"
  git status --short
  exit 1
fi

echo "Checking types, lint and tests"
if node -e "process.exit(require('./package.json').scripts?.check ? 0 : 1)"; then npm run check --silent; else npx tsc --noEmit; fi

echo "Android doctor"
node scripts/android/doctor.mjs

$EAS whoami >/dev/null 2>&1 || $EAS login
$EAS build --profile production --platform android --auto-submit
echo
echo "Uploaded to Google Play internal testing. It shows up for testers in the"
echo "Play Store app within a few minutes (open the opt in link once per phone)."
