#!/usr/bin/env node
// Paywall doctor: checks that an app's paywall is wired the Graysmith Labs way
// (HQ docs/paywalls.md, sections 3 to 5). Static, reads the source only.
//   node scripts/paywall/doctor.mjs           # table, exit 1 on any FAIL
//   node scripts/paywall/doctor.mjs --json    # machine readable, for paywall-lab
// Run it from the app repo root. Synced from HQ (templates/app/scripts/paywall).
// Change it there.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_DIRS = ['src', 'app', 'components', 'lib', 'utils', 'hooks', 'services', 'screens'];
const SKIP = new Set(['node_modules', 'ios', 'android', 'build', 'dist', '.expo', '__tests__']);
const EXT = /\.(ts|tsx|js|jsx)$/;

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
  return out;
}

// Calls like track('paywall_view', {...}) with the property object's text.
export function trackCalls(text, event) {
  const calls = [];
  const re = new RegExp(`track\\(\\s*([^,)]*['"\`]${event}['"\`][^,)]*)(?:,\\s*(\\{[^}]*\\}|[A-Za-z_$][\\w$.]*))?`, 'g');
  let m;
  while ((m = re.exec(text))) calls.push({ index: m.index, props: m[2] || '' });
  return calls;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// Distinct paywall sources named in code: source: 'x', openPaywall('x'),
// source="x", ?source=x and members of a PaywallSource union type.
export function sources(text) {
  const found = new Set();
  const pats = [
    /\bsource\s*[:=]\s*['"`]([a-z][a-z0-9_]*)['"`]/g,
    /\bsource=\{?['"`]([a-z][a-z0-9_]*)['"`]/g,
    /(?:openPaywall|showPaywall|presentPaywall|goToPaywall|track[A-Z]\w*)\(\s*['"`]([a-z][a-z0-9_]*)['"`]/g,
    /[?&]source=([a-z][a-z0-9_]*)/g,
  ];
  for (const re of pats) for (const m of text.matchAll(re)) found.add(m[1]);
  for (const m of text.matchAll(/type\s+PaywallSource\s*=([^;]+);/g))
    for (const s of m[1].matchAll(/['"`]([a-z][a-z0-9_]*)['"`]/g)) found.add(s[1]);
  found.delete('unknown');
  return [...found].sort();
}

export function diagnose(root) {
  const files = listFiles(root).map((f) => ({ path: relative(root, f), text: readFileSync(f, 'utf8') }));
  const all = files.map((f) => f.text).join('\n');
  const paywallFiles = files.filter((f) => /paywall|premium|subscribe|pricing/i.test(f.path) || /PaywallContent|purchasePackage|restorePurchases/.test(f.text));
  const pw = paywallFiles.map((f) => f.text).join('\n');
  const subscription = /ANNUAL|MONTHLY|WEEKLY|\$rc_(annual|monthly|weekly)|periodType|packageType|'annual'|'monthly'/.test(pw);
  const results = [];
  const add = (id, level, title, detail = '') => results.push({ id, level, title, detail });

  // Tracking (section 5)
  const views = files.flatMap((f) => trackCalls(f.text, 'paywall_view').map((c) => ({ ...c, f })));
  const hasMappedView = /['"]paywall_view['"]\s*,\s*\{[^}]*source/.test(all);
  if (!views.length && !hasMappedView) add('P1', 'FAIL', 'paywall_view is tracked', 'no track("paywall_view") call found');
  else add('P1', 'PASS', 'paywall_view is tracked', `${views.length || 1} call(s)`);

  const noSource = views.filter((c) => !/\bsource\b/.test(c.props) && !/^[A-Za-z_$]/.test(c.props));
  if (noSource.length) add('P2', 'FAIL', 'every paywall_view passes source', noSource.map((c) => `${c.f.path}:${lineOf(c.f.text, c.index)}`).join(', '));
  else add('P2', 'PASS', 'every paywall_view passes source');

  if (!/PAYWALL_VERSION/.test(all)) add('P3', 'FAIL', 'PAYWALL_VERSION constant exists and is sent as paywall_version', 'add export const PAYWALL_VERSION = "<app>-<yyyy-mm-dd>" and send it on every paywall event');
  else if (!/paywall_version/.test(all)) add('P3', 'FAIL', 'PAYWALL_VERSION constant exists and is sent as paywall_version', 'PAYWALL_VERSION is defined but no event sends paywall_version');
  else add('P3', 'PASS', 'PAYWALL_VERSION is sent as paywall_version', (all.match(/PAYWALL_VERSION\s*=\s*['"`]([^'"`]+)/) || [])[1] || '');

  if (!/['"`]paywall_close['"`]/.test(all)) add('P4', 'FAIL', 'paywall_close is tracked on dismiss', 'track("paywall_close", { source, paywall_version, seconds }) when the paywall closes without a purchase');
  else add('P4', 'PASS', 'paywall_close is tracked on dismiss');

  // Any place the event name is followed by its properties: track('purchase', {...}),
  // the trial_start/purchase ternary, and name maps like ['trial_start', {...}].
  const convAll = files.flatMap((f) => [...f.text.matchAll(/['"`](trial_start|purchase)['"`]\s*\]?\s*,\s*(\{[^}]*\}|[A-Za-z_$][\w$.]*)/g)].map((m) => ({ props: m[2], f, index: m.index })));
  if (!convAll.length && !/['"]trial_start['"]/.test(all)) add('P5', subscription ? 'FAIL' : 'WARN', 'trial_start and purchase carry source', 'no trial_start or purchase tracking found');
  else if (convAll.some((c) => c.props.startsWith('{') && !/\bsource\b/.test(c.props))) add('P5', 'FAIL', 'trial_start and purchase carry source', [...new Set(convAll.filter((c) => c.props.startsWith('{') && !/\bsource\b/.test(c.props)).map((c) => `${c.f.path}:${lineOf(c.f.text, c.index)}`))].join(', '));
  else add('P5', 'PASS', 'trial_start and purchase carry source');

  // Visibility (section 4)
  const src = sources(all);
  if (subscription && !src.includes('onboarding')) add('V1', 'FAIL', 'onboarding ends on a paywall (source onboarding)', `sources found: ${src.join(', ') || 'none'}`);
  else add('V1', subscription ? 'PASS' : 'SKIP', 'onboarding ends on a paywall (source onboarding)');
  if (!src.some((s) => /home|today|tile/.test(s))) add('V2', 'WARN', 'a Premium entry on home', `sources found: ${src.join(', ') || 'none'}`);
  else add('V2', 'PASS', 'a Premium entry on home');
  if (src.length < 4) add('V3', 'WARN', 'at least four entry points with their own source', `${src.length}: ${src.join(', ') || 'none'}`);
  else add('V3', 'PASS', 'at least four entry points with their own source', src.join(', '));

  // Hard rules visible in code (section 3)
  if (!/restorePurchases|Restore/.test(pw)) add('H1', 'FAIL', 'Restore purchases on the paywall');
  else add('H1', 'PASS', 'Restore purchases on the paywall');
  if (subscription && !/Terms|TERMS_URL|stdeula/.test(pw)) add('H2', 'FAIL', 'Terms of Use link on the paywall');
  else add('H2', subscription ? 'PASS' : 'SKIP', 'Terms of Use link on the paywall');
  if (!/privacy/i.test(pw)) add('H3', 'FAIL', 'Privacy Policy link on the paywall');
  else add('H3', 'PASS', 'Privacy Policy link on the paywall');
  const trialCopy = /free (week|trial)|trial/i.test(pw);
  const gated = /[Ee]ligib|checkTrialOrIntroductoryPriceEligibility|introPrice|freeTrialOf|trialOffer|\.trial\b/.test(pw);
  if (subscription && trialCopy && !gated) add('H4', 'FAIL', 'trial copy only when the store says the user is eligible', 'trial wording found with no eligibility check');
  else add('H4', subscription ? 'PASS' : 'SKIP', 'trial copy only when the store says the user is eligible');

  return { app: root.split('/').pop(), subscription, sources: src, results };
}

function main() {
  const json = process.argv.includes('--json');
  const report = diagnose(process.cwd());
  const fails = report.results.filter((r) => r.level === 'FAIL').length;
  if (json) {
    console.log(JSON.stringify({ ...report, fails }, null, 2));
  } else {
    console.log(`Paywall doctor: ${report.app} (${report.subscription ? 'subscription' : 'one time purchase'}), HQ docs/paywalls.md`);
    for (const r of report.results) console.log(`${r.level.padEnd(4)} ${r.id} ${r.title}${r.detail ? `: ${r.detail}` : ''}`);
    console.log(fails ? `${fails} FAIL` : 'No FAIL');
  }
  process.exit(fails ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
