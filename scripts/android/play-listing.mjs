#!/usr/bin/env node
// Google Play listing for Graysmith Labs apps, the Android twin of store:push.
// EAS Metadata only covers the App Store, so the Play listing lives in
// play.config.json and is pushed through the Google Play Developer API.
//
//   node scripts/android/play-listing.mjs --init     create play.config.json from store.config.json
//   node scripts/android/play-listing.mjs --check    lint limits, dashes, price wording and image sizes
//   node scripts/android/play-listing.mjs --push     check, then publish text and images in one edit
//   node scripts/android/play-listing.mjs --pull     write the live Play listing text into play.config.json
//
// Credentials for --push and --pull: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (the key
// JSON itself, as in the GitHub secret) or GOOGLE_PLAY_SERVICE_ACCOUNT (a path).
// It is the same service account EAS Submit uses. No npm dependencies.
//
// Synced from HQ (templates/app/scripts/android). Change it there.

import { Buffer } from 'node:buffer';
import { createSign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const CONFIG = join(root, 'play.config.json');
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const UPLOAD = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications';

export const LIMITS = { title: 30, shortDescription: 80, fullDescription: 4000 };
// Play's metadata policy bans price and promotion claims in the title, icon and
// short description, and screenshots follow the same rule as Apple 2.3.7 here.
export const PROMO_WORDS = /\bfree\b|\btrial\b|\bdiscount|\bsale\b|\bbest\b|#1|\btop\b|[$€£¥]\s?\d|\d+\s?% off|\bnew\b|\bdownload now\b/i;
export const IMAGE_RULES = {
  icon: { w: 512, h: 512, max: 1 },
  featureGraphic: { w: 1024, h: 500, max: 1 },
  phoneScreenshots: { min: 2, max: 8, side: [320, 3840] },
  sevenInchScreenshots: { max: 8, side: [320, 3840] },
  tenInchScreenshots: { max: 8, side: [1080, 7680] },
};

export function proseDashes(text) {
  const s = String(text).replace(/https?:\/\/\S+/g, ' ').replace(/\S+@\S+/g, ' ');
  return s.split('\n').filter((l) => /[‐-―−]/.test(l) || /(^|[\s(])-(\s|$)|\w-\w/.test(l)).map((l) => l.trim().slice(0, 80));
}

export function pngSize(buf) {
  if (!buf || buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

export function lintPlayConfig(cfg, dir = root) {
  const problems = [];
  if (!cfg?.listings || !Object.keys(cfg.listings).length) problems.push('play.config.json has no listings');
  for (const [lang, l] of Object.entries(cfg?.listings || {})) {
    for (const [field, max] of Object.entries(LIMITS)) {
      const v = l[field];
      if (typeof v !== 'string' || !v.trim()) {
        problems.push(`${lang} ${field} is empty`);
        continue;
      }
      if (v.length > max) problems.push(`${lang} ${field} is ${v.length} characters, limit ${max}`);
      for (const hit of proseDashes(v)) problems.push(`${lang} ${field} has a dash: "${hit}"`);
    }
    for (const field of ['title', 'shortDescription']) {
      const hit = l[field] && PROMO_WORDS.exec(l[field]);
      if (hit) problems.push(`${lang} ${field} says "${hit[0]}"; Play metadata policy bans price, ranking and promo claims in the title and short description`);
    }
    if (/\b(iphone|ipad|app store|ios)\b/i.test(`${l.title} ${l.shortDescription} ${l.fullDescription}`))
      problems.push(`${lang} mentions iPhone, iPad, iOS or the App Store; Play rejects listings that reference another platform`);
  }
  for (const [lang, imgs] of Object.entries(cfg?.images || {})) {
    for (const [type, rule] of Object.entries(IMAGE_RULES)) {
      const list = [].concat(imgs[type] || []);
      if (rule.min && list.length < rule.min) problems.push(`${lang} ${type}: ${list.length} images, Play needs at least ${rule.min}`);
      if (list.length > rule.max) problems.push(`${lang} ${type}: ${list.length} images, Play takes at most ${rule.max}`);
      for (const f of list) {
        if (/paywall|premium|pricing/i.test(f)) problems.push(`${lang} ${type}: ${f} looks like a paywall frame; listing art never shows prices or trials`);
        const p = join(dir, f);
        if (!existsSync(p)) {
          problems.push(`${lang} ${type}: ${f} does not exist`);
          continue;
        }
        const size = pngSize(readFileSync(p));
        if (!size) continue;
        const [w, h] = size;
        if (rule.w && (w !== rule.w || h !== rule.h)) problems.push(`${lang} ${type}: ${f} is ${w} x ${h}, Play needs ${rule.w} x ${rule.h}`);
        if (rule.side) {
          const [lo, hi] = rule.side;
          if (Math.min(w, h) < lo || Math.max(w, h) > hi) problems.push(`${lang} ${type}: ${f} is ${w} x ${h}; each side must be ${lo} to ${hi}`);
          if (Math.max(w, h) > 2 * Math.min(w, h)) problems.push(`${lang} ${type}: ${f} is ${w} x ${h}; the long side may be at most twice the short side`);
        }
      }
    }
  }
  return problems;
}

function appConfig() {
  try {
    return JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
  } catch {
    return {};
  }
}

function packageName(cfg) {
  return cfg?.packageName || appConfig().android?.package;
}

// --init: seed the Play listing from the App Store listing.
function init() {
  if (existsSync(CONFIG)) {
    console.log('play.config.json already exists; edit it instead.');
    return;
  }
  const store = JSON.parse(readFileSync(join(root, 'store.config.json'), 'utf8'));
  const info = store.apple?.info || {};
  const listings = {};
  for (const [locale, l] of Object.entries(info)) {
    const lang = locale.includes('-') ? locale : `${locale}-${locale === 'en' ? 'US' : locale.toUpperCase()}`;
    const strip = (s) => String(s || '').replace(/\b(iPhone|iPad|iOS)\b/g, 'phone').replace(/App Store/g, 'Google Play');
    listings[lang] = {
      title: strip(l.title).slice(0, 30),
      shortDescription: strip(l.subtitle || l.promoText || '').slice(0, 80),
      fullDescription: strip(l.description).slice(0, 4000),
    };
  }
  const first = Object.keys(listings)[0] || 'en-US';
  const cfg = {
    packageName: appConfig().android?.package,
    defaultLanguage: first,
    details: { contactEmail: 'ramsey@graysmithlabs.com', contactWebsite: store.apple?.info?.[Object.keys(info)[0]]?.marketingUrl || 'https://graysmithlabs.com' },
    listings,
    images: { [first]: { icon: 'store/google/icon.png', featureGraphic: 'store/google/feature.png', phoneScreenshots: [] } },
  };
  writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`Wrote play.config.json for ${cfg.packageName}. Shorten the short description to one benefit, then add images (screenshot-producer makes them).`);
}

// ---------------------------------------------------------------- Google auth
function serviceAccount() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT && readFileSync(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT, 'utf8'));
  if (!raw) throw new Error('Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (key JSON) or GOOGLE_PLAY_SERVICE_ACCOUNT (path). See HQ docs/android.md.');
  return JSON.parse(raw);
}

async function token() {
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`Google auth failed: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function call(tok, method, url, body, type = 'application/json') {
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${tok}`, ...(body ? { 'content-type': type } : {}) },
    body: body && type === 'application/json' ? JSON.stringify(body) : body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url.replace(/\?.*/, '')} ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function push(cfg) {
  const pkg = packageName(cfg);
  if (!pkg) throw new Error('No package name in play.config.json or app.json');
  const tok = await token();
  const base = `${API}/${pkg}/edits`;
  const { id } = await call(tok, 'POST', base, {});
  try {
    if (cfg.details) await call(tok, 'PATCH', `${base}/${id}/details`, { defaultLanguage: cfg.defaultLanguage, ...cfg.details });
    for (const [lang, l] of Object.entries(cfg.listings)) {
      await call(tok, 'PUT', `${base}/${id}/listings/${lang}`, { language: lang, title: l.title, shortDescription: l.shortDescription, fullDescription: l.fullDescription, video: l.video || '' });
      console.log(`${lang} text set`);
    }
    for (const [lang, imgs] of Object.entries(cfg.images || {})) {
      for (const type of Object.keys(IMAGE_RULES)) {
        const list = [].concat(imgs[type] || []);
        if (!list.length) continue;
        await call(tok, 'DELETE', `${base}/${id}/listings/${lang}/${type}`);
        for (const f of list) await call(tok, 'POST', `${UPLOAD}/${pkg}/edits/${id}/listings/${lang}/${type}?uploadType=media`, readFileSync(join(root, f)), 'image/png');
        console.log(`${lang} ${type}: ${list.length} uploaded`);
      }
    }
    await call(tok, 'POST', `${base}/${id}:commit`);
    console.log(`Play listing for ${pkg} committed. Google reviews listing changes, usually within a day.`);
  } catch (e) {
    await call(tok, 'DELETE', `${base}/${id}`).catch(() => {});
    if (/draft app|not been published|APK|bundle/i.test(e.message))
      throw new Error(`${e.message}\nPlay will not take listing edits through the API until the app's first build is uploaded. Ship the first build with npm run build:play, then push again.`);
    throw e;
  }
}

async function pull() {
  const cfg = existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf8')) : { images: {} };
  const pkg = packageName(cfg);
  const tok = await token();
  const base = `${API}/${pkg}/edits`;
  const { id } = await call(tok, 'POST', base, {});
  const { listings = [] } = await call(tok, 'GET', `${base}/${id}/listings`);
  const details = await call(tok, 'GET', `${base}/${id}/details`);
  await call(tok, 'DELETE', `${base}/${id}`);
  cfg.packageName = pkg;
  cfg.defaultLanguage = details.defaultLanguage;
  cfg.details = { contactEmail: details.contactEmail, contactWebsite: details.contactWebsite };
  cfg.listings = Object.fromEntries(listings.map((l) => [l.language, { title: l.title, shortDescription: l.shortDescription, fullDescription: l.fullDescription }]));
  writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`Pulled ${listings.length} listings into play.config.json`);
}

async function main() {
  const mode = process.argv[2] || '--check';
  if (mode === '--init') return init();
  if (mode === '--pull') return pull();
  if (!existsSync(CONFIG)) throw new Error('No play.config.json. Run: node scripts/android/play-listing.mjs --init');
  const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'));
  const problems = lintPlayConfig(cfg);
  if (problems.length) {
    console.error(`play.config.json needs fixes:\n* ${problems.join('\n* ')}`);
    process.exit(1);
  }
  console.log('play.config.json passes');
  if (mode === '--push') await push(cfg);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
