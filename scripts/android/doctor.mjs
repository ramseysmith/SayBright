#!/usr/bin/env node
// Android doctor for Graysmith Labs Expo apps. Run from the app root:
//
//   node scripts/android/doctor.mjs             static checks (seconds)
//   node scripts/android/doctor.mjs --prebuild  also generates the native Android
//                                               project in a scratch copy and checks
//                                               the real manifest and SDK levels
//   node scripts/android/doctor.mjs --json      machine readable result
//
// Every rule here is a bug Graysmith Labs shipped, or nearly shipped, on Android:
// Apple keys passed to RevenueCat on Android, Google test ad units in release,
// iOS AdMob IDs reused on Android, App Store links shown to Android users,
// iOS only native modules called on Android, notifications that never ask for
// permission because no channel exists, and permissions Play rejects.
// Exit code 1 when anything FAILs. WARN never fails the run.
//
// Synced from HQ (templates/app/scripts/android). Change it there.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, rmSync, symlinkSync, cpSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PUBLISHER = 'ca-app-pub-3940256099942544';
const PACKAGE_RULE = /^com\.graysmithlabs\.[a-z][a-z0-9]*$/;
// Permissions Play rejects or flags for apps like ours. An app that truly needs
// one lists it in app.json expo.extra.android.allowPermissions with a reason.
const POLICY_PERMISSIONS = {
  'android.permission.READ_EXTERNAL_STORAGE': 'legacy storage; Android 13+ ignores it and Play flags broad storage access',
  'android.permission.WRITE_EXTERNAL_STORAGE': 'legacy storage; Play flags broad storage access',
  'android.permission.SYSTEM_ALERT_WINDOW': 'draw over other apps; only the dev menu needs it',
  'android.permission.READ_MEDIA_IMAGES': 'Play Photo and Video Permissions policy; use the system photo picker instead',
  'android.permission.READ_MEDIA_VIDEO': 'Play Photo and Video Permissions policy; use the system photo picker instead',
  'android.permission.ACCESS_BACKGROUND_LOCATION': 'needs a Play declaration and video',
  'android.permission.QUERY_ALL_PACKAGES': 'needs a Play declaration',
  'android.permission.SCHEDULE_EXACT_ALARM': 'needs a Play declaration unless the app is an alarm or calendar',
};
// Fine to have, but each one needs a Data safety answer in Play Console.
const DECLARE_PERMISSIONS = {
  'android.permission.RECORD_AUDIO': 'microphone',
  'android.permission.CAMERA': 'camera',
  'com.google.android.gms.permission.AD_ID': 'advertising ID (ads)',
};

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const results = [];
const add = (level, rule, msg, file) => results.push({ level, rule, msg, file: file ? relative(root, file) : undefined });
const fail = (r, m, f) => add('FAIL', r, m, f);
const warn = (r, m, f) => add('WARN', r, m, f);
const pass = (r, m) => add('PASS', r, m);

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function expoConfig() {
  try {
    const out = execFileSync('npx', ['expo', 'config', '--type', 'public', '--json'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, EXPO_NO_TELEMETRY: '1' },
      timeout: 120000,
    }).toString();
    return JSON.parse(out.slice(out.indexOf('{')));
  } catch {
    return readJson(join(root, 'app.json'))?.expo || null;
  }
}

const plugin = (cfg, name) => {
  for (const p of cfg?.plugins || []) {
    if (p === name) return {};
    if (Array.isArray(p) && p[0] === name) return p[1] || {};
  }
  return null;
};

function sourceFiles() {
  const out = [];
  const skip = /(^|\/)(node_modules|\.git|android|ios|dist|web-build|\.expo|__tests__|scripts|store|design|docs|web-stubs|coverage)(\/|$)/;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const rel = relative(root, p);
      if (skip.test(rel)) continue;
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?)$/.test(name) && !/\.(test|spec|web|ios)\.[jt]sx?$/.test(name) && !/\.d\.ts$/.test(name)) out.push(p);
    }
  };
  walk(root);
  return out;
}

// Strip comments so a URL in a comment or doc block is not a finding.
const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// ---------------------------------------------------------------- config
const cfg = expoConfig();
if (!cfg) {
  fail('config', 'could not read the Expo config (app.json or app.config.js)');
} else {
  const a = cfg.android || {};
  if (!a.package) fail('package', 'android.package is missing; set com.graysmithlabs.<app> in app.json');
  else if (!PACKAGE_RULE.test(a.package)) fail('package', `android.package is ${a.package}; Graysmith Labs uses com.graysmithlabs.<app> (permanent once on Play)`);
  else pass('package', a.package);

  const fg = a.adaptiveIcon?.foregroundImage;
  if (!fg) fail('icon', 'android.adaptiveIcon.foregroundImage is missing; Android would show a shrunken square icon');
  else if (!existsSync(join(root, fg))) fail('icon', `adaptive icon foreground ${fg} does not exist`);
  else pass('icon', 'adaptive icon set');
  if (fg && !a.adaptiveIcon?.monochromeImage) warn('icon', 'no android.adaptiveIcon.monochromeImage; themed icons on Android 13+ fall back to the full color art');

  const notif = plugin(cfg, 'expo-notifications');
  if (notif) {
    const icon = notif.icon || cfg.notification?.icon;
    if (!icon) warn('notification-icon', 'expo-notifications has no small icon; Android shows a generic square. Add a white on transparent 96x96 PNG as its icon');
    else if (icon === cfg.icon || /\/icon\.png$/.test(icon)) fail('notification-icon', `notification icon is the full color app icon (${icon}); Android renders it as a solid white square. Use a white on transparent silhouette`);
    else pass('notification-icon', icon);
  }

  const ads = plugin(cfg, 'react-native-google-mobile-ads');
  if (ads) {
    const and = ads.androidAppId || '';
    const ios = ads.iosAppId || '';
    if (!and) fail('admob-app', 'react-native-google-mobile-ads has no androidAppId; the app crashes at launch on Android');
    else if (and === ios) fail('admob-app', `androidAppId equals iosAppId (${and}); AdMob app IDs are per platform, so Android serves nothing. Create the Android app in AdMob`);
    else if (and.startsWith(TEST_PUBLISHER)) warn('admob-app', 'androidAppId is Google\'s sample ID, so Android ads must stay off (src ads config). Fine for internal testing, not for a production release with ads');
    else pass('admob-app', and);
  }

  const blocked = new Set(a.blockedPermissions || []);
  const allowed = new Set(Object.keys(cfg.extra?.android?.allowPermissions || {}));
  for (const p of a.permissions || []) {
    if (POLICY_PERMISSIONS[p] && !allowed.has(p)) fail('permissions', `${p} is requested in app.json: ${POLICY_PERMISSIONS[p]}`);
  }
  const wantBlocked = ['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.SYSTEM_ALERT_WINDOW'];
  const missing = wantBlocked.filter((p) => !blocked.has(p) && !allowed.has(p));
  if (missing.length) fail('permissions', `add to android.blockedPermissions: ${missing.join(', ')} (libraries add them; Play flags them)`);
  else pass('permissions', 'legacy storage and overlay permissions blocked');
}

// ---------------------------------------------------------------- eas.json
const eas = readJson(join(root, 'eas.json'));
if (!eas) fail('eas', 'eas.json is missing');
else {
  const prodBuild = eas.build?.production || {};
  if (prodBuild.android?.buildType === 'apk') fail('eas', 'build.production.android.buildType is apk; Play needs an app bundle');
  const sub = eas.submit?.production?.android;
  if (!sub) fail('eas', 'submit.production.android is missing; add { "track": "internal" } so builds go to Play internal testing');
  else if (sub.serviceAccountKeyPath) warn('eas', 'serviceAccountKeyPath points at a file; prefer the Google service account key stored in EAS credentials so CI needs no file');
  else pass('eas', `submit to Play track ${sub.track || 'internal'}`);
  const apk = Object.entries(eas.build || {}).find(([, p]) => p.android?.buildType === 'apk');
  if (!apk) warn('eas', 'no build profile makes an APK; the android-sim profile lets agents run the app on the local emulator (scripts/android/emulator.sh build)');
  if (eas.cli?.appVersionSource === 'local' && prodBuild.autoIncrement === false) {
    const vc = cfg?.android?.versionCode;
    if (!vc) fail('eas', 'appVersionSource is local and autoIncrement is off, but android.versionCode is not set');
  }
}

// ---------------------------------------------------------------- source
const files = sourceFiles();
let rcAndroidKey = /goog_[A-Za-z0-9]{20,}/.test(JSON.stringify(eas || {}));
let notifUsed = false;
let channelMade = false;
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const t = code(raw);
  const ok = /android-ok/.test(raw);

  // RevenueCat: an Apple key on Android, or no Android key at all.
  if (/goog_[A-Za-z0-9]{20,}/.test(t) || /EXPO_PUBLIC_REVENUECAT_ANDROID_KEY|REVENUECAT_GOOGLE_KEY/.test(t)) rcAndroidKey = true;
  for (const m of t.matchAll(/(android|default)\s*:\s*['"`](appl_[A-Za-z0-9]+)/g))
    fail('revenuecat', `${m[1]} branch passes the Apple RevenueCat key ${m[2]}; Android needs the goog_ key from the RevenueCat Play Store app`, f);

  // AdMob unit IDs: the same ID for iOS and Android, or a test ID hardcoded for Android.
  for (const m of t.matchAll(/ios\s*:\s*['"`](ca-app-pub-\d+\/\d+)['"`][\s\S]{0,200}?android\s*:\s*['"`](ca-app-pub-\d+\/\d+)/g))
    if (m[1] === m[2]) fail('admob-units', `iOS and Android share ad unit ${m[1]}; create Android units in AdMob`, f);
  for (const m of t.matchAll(/const\s+(\w*ANDROID\w*)\s*=\s*['"`](ca-app-pub-\d+\/\d+)['"`]/g))
    if (m[2].startsWith(TEST_PUBLISHER)) fail('admob-units', `${m[1]} is a Google test unit in release code; use the live Android unit or turn Android ads off`, f);
  if (/Platform\.OS\s*===\s*['"]ios['"]\s*\?\s*\w+\s*:\s*TestIds\./.test(t))
    fail('admob-units', 'Android always gets TestIds in release; use live Android units or turn Android ads off', f);
  for (const m of t.matchAll(/const\s+(\w*ANDROID\w*)\s*=\s*['"`](ca-app-pub-\d+\/\d+)['"`]/g)) {
    const iosSame = new RegExp(`IOS\\w*\\s*=\\s*['"\`]${m[2].replace(/[/]/g, '\\/')}`).test(t);
    if (iosSame) fail('admob-units', `${m[1]} reuses the iOS unit ${m[2]}; AdMob units are per platform`, f);
  }

  // App Store links shown to Android users.
  if (!ok && /apps\.apple\.com|itms-apps:/.test(t) && !/Platform\.(OS|select)|storeLinks|stores['"]/.test(t))
    fail('store-links', 'App Store URL with no platform branch; Android users would land on the App Store. Use the stores helper (rate, manage subscription, share link)', f);
  if (!ok && />[^<{]*\bApp Store\b[^<{]*</.test(t) && !/Platform\.(OS|select)/.test(t))
    warn('store-wording', 'visible text says "App Store"; say "the store" or branch on Platform for Android', f);

  // iOS only views with no Android fallback.
  if (/<SymbolView\b(?![^>]*fallback)/.test(t)) fail('ios-only-ui', 'SymbolView without a fallback renders nothing on Android', f);
  if (/from ['"]react-native-ios-context-menu['"]|from ['"]react-native-ios-utilities['"]/.test(t) && !/Platform\.OS/.test(t))
    fail('ios-only-ui', 'iOS only context menu library used without a Platform branch', f);
  if (/ActionSheetIOS\./.test(t) && !/Platform\.OS/.test(t)) fail('ios-only-ui', 'ActionSheetIOS has no Android implementation', f);
  if (/DynamicColorIOS\(/.test(t) && !/Platform\.(OS|select)/.test(t)) fail('ios-only-ui', 'DynamicColorIOS throws on Android', f);

  // Notifications: Android 13+ shows no permission prompt until a channel exists.
  if (/from ['"]expo-notifications['"]/.test(t)) notifUsed = true;
  if (/setNotificationChannelAsync\s*\(/.test(t)) channelMade = true;
}
if (cfg && (plugin(cfg, 'react-native-purchases') !== null || existsSync(join(root, 'node_modules/react-native-purchases')))) {
  const pkg = readJson(join(root, 'package.json'));
  if (pkg?.dependencies?.['react-native-purchases']) {
    if (rcAndroidKey) pass('revenuecat', 'Android RevenueCat key wired');
    else fail('revenuecat', 'no Android RevenueCat key (goog_...) anywhere; purchases fail on Android. Create the Play Store app in the RevenueCat project and wire its public key');
  }
}
if (notifUsed && !channelMade)
  fail('notifications', 'expo-notifications is used but no Android channel is created; Android 13+ never shows the permission prompt and reminders never arrive. Call setNotificationChannelAsync("default", ...) before asking');
else if (notifUsed) pass('notifications', 'Android channel created');

// ---------------------------------------------------------------- local native modules
const modDir = join(root, 'modules');
if (existsSync(modDir)) {
  for (const m of readdirSync(modDir)) {
    const conf = readJson(join(modDir, m, 'expo-module.config.json'));
    if (!conf) continue;
    const plats = conf.platforms || [];
    if (plats.includes('android')) continue;
    const idx = ['index.ts', 'index.js', 'src/index.ts'].map((p) => join(modDir, m, p)).find(existsSync);
    const srcs = [idx, ...(existsSync(join(modDir, m, 'src')) ? readdirSync(join(modDir, m, 'src')).map((f) => join(modDir, m, 'src', f)) : [])].filter(Boolean);
    const all = srcs.map((p) => (statSync(p).isFile() ? readFileSync(p, 'utf8') : '')).join('\n');
    const guarded = /requireOptionalNativeModule|Platform\.OS\s*[!=]==\s*['"](ios|android)['"]/.test(all) || srcs.some((p) => /\.android\.[jt]s$/.test(p));
    if (guarded) pass('native-modules', `${m} is iOS only and guarded`);
    else fail('native-modules', `local module ${m} is iOS only (platforms ${JSON.stringify(plats)}) and its JS calls requireNativeModule unguarded; Android crashes at import. Use requireOptionalNativeModule and a fallback`, idx);
  }
}

// ---------------------------------------------------------------- prebuild
if (args.has('--prebuild')) {
  const tmp = mkdtempSync(join(tmpdir(), 'android-doctor-'));
  try {
    const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
    for (const f of tracked) {
      if (f.startsWith('android/') || f.startsWith('ios/')) continue;
      mkdirSync(dirname(join(tmp, f)), { recursive: true });
      try {
        cpSync(join(root, f), join(tmp, f));
      } catch {}
    }
    for (const f of ['.env', '.env.local']) if (existsSync(join(root, f))) cpSync(join(root, f), join(tmp, f));
    symlinkSync(join(root, 'node_modules'), join(tmp, 'node_modules'));
    execFileSync('git', ['init', '-q'], { cwd: tmp });
    execFileSync('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install', '--clean'], {
      cwd: tmp,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', EXPO_NO_GIT_STATUS: '1', EXPO_NO_TELEMETRY: '1' },
      timeout: 300000,
    });
    const manifest = readFileSync(join(tmp, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
    // blockedPermissions writes tools:node="remove" entries; those are removed at merge, not requested
    const perms = [...manifest.matchAll(/<uses-permission\b[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => !/tools:node="remove"/.test(tag))
      .map((tag) => /android:name="([^"]+)"/.exec(tag)?.[1])
      .filter(Boolean);
    const allowed = new Set(Object.keys(cfg?.extra?.android?.allowPermissions || {}));
    for (const p of perms) if (POLICY_PERMISSIONS[p] && !allowed.has(p)) fail('manifest', `merged manifest requests ${p}: ${POLICY_PERMISSIONS[p]}. Add it to android.blockedPermissions`);
    const declare = perms.filter((p) => DECLARE_PERMISSIONS[p]).map((p) => DECLARE_PERMISSIONS[p]);
    if (declare.length) warn('manifest', `declare in Play Data safety: ${declare.join(', ')}`);
    const micJustified = /expo-speech-recognition|expo-audio|"microphonePermission":"[^"]+"|"recordAudioAndroid":true/.test(JSON.stringify(cfg?.plugins || []));
    if (perms.includes('android.permission.RECORD_AUDIO') && !micJustified)
      fail('manifest', 'RECORD_AUDIO is in the manifest but the app never records (a library added it); block it or Play asks for a microphone declaration');
    const appId = /com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value="([^"]+)"/.exec(manifest)?.[1];
    if (appId) pass('manifest', `AdMob application ID in manifest: ${appId}`);
    const toml = readFileSync(join(root, 'node_modules/react-native/gradle/libs.versions.toml'), 'utf8');
    const target = +(/targetSdk\s*=\s*"(\d+)"/.exec(toml)?.[1] || 0);
    const override = plugin(cfg, 'expo-build-properties')?.android?.targetSdkVersion;
    const effective = override || target;
    if (effective < 36) fail('target-sdk', `targetSdk ${effective}; Google Play requires 36 for new apps and updates since Aug 31 2026`);
    else pass('target-sdk', `targetSdk ${effective}`);
    pass('prebuild', 'native Android project generated');
  } catch (e) {
    fail('prebuild', `expo prebuild for Android failed: ${String(e.stderr || e.message).split('\n').filter(Boolean).slice(-4).join(' | ')}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- report
const fails = results.filter((r) => r.level === 'FAIL');
if (args.has('--json')) {
  console.log(JSON.stringify({ app: cfg?.name, package: cfg?.android?.package, ok: !fails.length, results }, null, 2));
} else {
  const order = { FAIL: 0, WARN: 1, PASS: 2 };
  for (const r of results.sort((a, b) => order[a.level] - order[b.level]))
    console.log(`${r.level.padEnd(4)} ${r.rule.padEnd(18)} ${r.msg}${r.file ? `  (${r.file})` : ''}`);
  console.log(`\n${cfg?.name || basename(root)}: ${fails.length ? `${fails.length} to fix before Android ships` : 'ready for Android'}`);
}
process.exit(fails.length ? 1 : 0);
