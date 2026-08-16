# SayBright

Expo managed React Native app, TypeScript. Part of the Graysmith Labs portfolio.
EAS Build and EAS Update.

For a full stack breakdown, run `/init`. This file covers the things that have
actually bitten past sessions.

## Verification: what the sandbox cannot confirm

"The code compiles" is not "the fix works". Some changes only manifest on a real
device or a live deploy, and this environment cannot confirm them. When a change
touches any of these, mark it **UNVERIFIED, requires device testing** and give a
short on device checklist instead of reporting it resolved:

* Audio: looping, loop gaps, playback timing, mixing
* Splash screen and app launch appearance
* Camera, image capture, and EXIF or crop behavior
* Haptics, push notifications, and background behavior

Past sessions shipped audio and splash fixes that looked done but were never
confirmed on device, which caused repeat iteration. Do not repeat that. Flag it.

## Build and environment preflight

Before attempting a local iOS build, check the environment in one shot rather
than retrying a blocked build:

* Correct working directory (`git rev-parse --show-toplevel`)
* Code signing certificates available
* CocoaPods installed and `pod install` has run
* Package manager: this repo uses **npm** unless a `bun.lock` appears

If any of these is missing, surface the blocker immediately and stop. Do not
burn build attempts retrying a known blocked toolchain. Prefer EAS Build when a
local native build is not set up.

**No typecheck or lint script yet.** Unlike the other portfolio apps, this repo
has no `typecheck` or `lint` in `package.json`. Consider adding
`"typecheck": "tsc --noEmit"` and `"lint": "expo lint"` so the same gates the
`/ship` skill expects exist here too. Only `start`, `ios`, `android`, and `web`
are defined today.

## Git and shipping

A commit is not shipped until it is on the remote, and pushes can fail silently
on missing credentials. After committing, verify the push landed: confirm
`git status` shows the branch up to date with its upstream, not "ahead by N". If
the push failed on credentials, say the work is **local only**, name the branch,
and give the fix rather than reporting success. The `/ship` skill runs this whole
loop (gates, commit, push verify, unverified flags).

## Writing style for anything a human reads

Ramsey reads dashes as a tell that text was machine written. In release notes,
store copy, paywall copy, commit messages, and reports, use no hyphens, em
dashes, or en dashes in prose. Write compound modifiers open, for example crash
free and cross platform. Write ranges with the word to. Code, flags, and package
names keep whatever punctuation they need.

## Scope

For UI and UX changes, prefer the smallest change that fixes the issue. Do not
redesign surrounding components or expand scope without confirming first. A past
auto capture camera redesign was rejected as too much and had to be reverted.
