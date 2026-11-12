#!/usr/bin/env node
// Store doctor: checks that an app asks for ratings and gets found the
// Graysmith Labs way (HQ docs/acquisition.md, section 2). Static, reads the
// source and store.config.json only.
//   node scripts/store/doctor.mjs           # table, exit 1 on any FAIL
//   node scripts/store/doctor.mjs --json    # machine readable
// Run it from the app repo root. Synced from HQ (templates/app/scripts/store).
// Change it there.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_DIRS = ['src', 'app', 'components', 'lib', 'utils', 'hooks', 'services', 'screens'];
const ROOT_FILES = ['App.tsx', 'App.ts', 'App.js'];
const SKIP = new Set(['node_modules', 'ios', 'android', 'build', 'dist', '.expo', '__tests__']);
const EXT = /\.(ts|tsx|js|jsx)$/;
// A pause after a win shorter than this still reads as "right after it" (the
// success animation landing). This long or longer is a timer: CelebriDay asked
// 2500 ms after Today opened and SayBright 2000 ms after it, until Nov 12 2026.
export const MAX_DELAY_MS = 2000;

export function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name) || name.startsWith('.')) continue;
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (EXT.test(name) && !/\.(test|spec)\./.test(name)) out.push(p);
    }
  };
  for (const d of SRC_DIRS) if (existsSync(join(root, d))) walk(join(root, d));
  for (const f of ROOT_FILES) if (existsSync(join(root, f))) out.push(join(root, f));
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// Calls that ask for a rating: StoreReview.requestReview() and the app's own
// wrappers (maybeRequestReview, maybeAskForReview, askForReview). Definitions
// (function x(, const x = ) are not calls.
const CALL = /\b(requestReview|maybe\w*Review|ask\w*Review)\s*\(/g;
export function reviewCalls(text) {
  const out = [];
  for (const m of text.matchAll(CALL)) {
    const before = text.slice(Math.max(0, m.index - 20), m.index);
    if (/function\s+$/.test(before)) continue;
    out.push({ index: m.index, name: m[1] });
  }
  return out;
}

// setTimeout(...) blocks with their body and delay, found by matching parens.
export function timeouts(text) {
  const out = [];
  for (const m of text.matchAll(/\bsetTimeout\s*\(/g)) {
    let depth = 0;
    let end = -1;
    for (let i = m.index + m[0].length - 1; i < text.length; i++) {
      const c = text[i];
      if (c === '(') depth++;
      else if (c === ')' && --depth === 0) {
        end = i;
        break;
      }
    }
    if (end < 0) continue;
    const body = text.slice(m.index, end + 1);
    const delay = /,\s*([\d_]+)\s*\)\s*$/.exec(body);
    out.push({ index: m.index, body, delay: delay ? Number(delay[1].replace(/_/g, '')) : null });
  }
  return out;
}

export function locales(root) {
  const p = join(root, 'store.config.json');
  if (!existsSync(p)) return null;
  try {
    const cfg = JSON.parse(readFileSync(p, 'utf8'));
    return Object.keys(cfg?.apple?.info || {});
  } catch {
    return null;
  }
}

export function diagnose(root) {
  const files = listFiles(root).map((f) => ({ path: relative(root, f), text: readFileSync(f, 'utf8') }));
  const all = files.map((f) => f.text).join('\n');
  const results = [];
  const add = (id, level, title, detail = '') => results.push({ id, level, title, detail });
  const where = (f, i) => `${f.path}:${lineOf(f.text, i)}`;

  // R1: the app asks at all
  if (!/\brequestReview\s*\(/.test(all)) add('R1', 'FAIL', 'the app asks for a rating (expo-store-review requestReview)', 'no requestReview() call found');
  else add('R1', 'PASS', 'the app asks for a rating (expo-store-review requestReview)');

  // R2: every ask is measurable
  if (!/['"`]review_prompt['"`]/.test(all)) add('R2', 'FAIL', 'a review_prompt event is sent when the prompt is requested', 'send review_prompt (with what triggered it) right after requestReview()');
  else add('R2', 'PASS', 'a review_prompt event is sent when the prompt is requested');

  // R3: a Rate row people can always use
  if (!/action=write-review/.test(all)) add('R3', 'FAIL', 'Settings has a Rate on the App Store row', 'link https://apps.apple.com/app/id<ID>?action=write-review');
  else add('R3', 'PASS', 'Settings has a Rate on the App Store row');

  // R4: never on a timer
  const timed = [];
  for (const f of files)
    for (const t of timeouts(f.text))
      if ((reviewCalls(t.body).length || /^setTimeout\s*\(\s*(requestReview|maybe\w*Review|ask\w*Review)\s*,/.test(t.body)) && (t.delay === null || t.delay >= MAX_DELAY_MS)) timed.push(`${where(f, t.index)} (${t.delay ?? 'unknown'} ms)`);
  if (timed.length) add('R4', 'FAIL', `the prompt is never on a timer (no delay of ${MAX_DELAY_MS} ms or more)`, timed.join(', '));
  else add('R4', 'PASS', `the prompt is never on a timer (no delay of ${MAX_DELAY_MS} ms or more)`);

  // R5: asked at launch? Fine only when it waits on a finished win (Drift asks
  // the first morning after a night of listening), so a person checks it.
  const launch = [];
  for (const f of files) {
    if (!reviewCalls(f.text).length) continue;
    if (/(^|\/)(App\.(t|j)sx?|_layout\.(t|j)sx?)$/.test(f.path)) launch.push(`${f.path} (root)`);
    else if (/AppState\.addEventListener/.test(f.text)) launch.push(`${f.path} (app comes to the foreground)`);
  }
  if (launch.length) add('R5', 'WARN', 'the prompt follows a win, not a launch', `${launch.join(', ')}: confirm it only fires after a finished win`);
  else add('R5', 'PASS', 'the prompt follows a win, not a launch');

  // L1: secondary localizations (lever 2)
  const loc = locales(root);
  if (loc === null) add('L1', 'SKIP', 'listing has secondary localizations', 'no store.config.json');
  else if (loc.length < 2) add('L1', 'WARN', 'listing has secondary localizations', `${loc.length} locale: ${loc.join(', ') || 'none'}; add Spanish (Mexico) and other US indexed locales (docs/acquisition.md 2.2)`);
  else add('L1', 'PASS', 'listing has secondary localizations', loc.join(', '));

  return { app: root.split('/').pop(), locales: loc, results };
}

function main() {
  const json = process.argv.includes('--json');
  const report = diagnose(process.cwd());
  const fails = report.results.filter((r) => r.level === 'FAIL').length;
  if (json) {
    console.log(JSON.stringify({ ...report, fails }, null, 2));
  } else {
    console.log(`Store doctor: ${report.app}, HQ docs/acquisition.md`);
    for (const r of report.results) console.log(`${r.level.padEnd(4)} ${r.id} ${r.title}${r.detail ? `: ${r.detail}` : ''}`);
    console.log(fails ? `${fails} FAIL` : 'No FAIL');
  }
  process.exit(fails ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
