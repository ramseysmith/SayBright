#!/usr/bin/env python3
"""
X promo card for one app, built from the App Store screenshots the repo already has.
Graysmith Labs kit (templates/ui/media). Run from anywhere:

    python3 promo_card.py <app repo> [--frames 1-home,3-onboarding,5-progress] [--tagline "..."]

Reads, all from the repo:
  store/screenshots/6.9-inch/*.png      the current listing frames (make.py writes them)
  app.json or app.config.js             expo name and icon
  store.config.json                     apple.info.en-US.subtitle, used as the tagline
  scripts/screenshots/scenes.json       the first scene's theme and ink, so the card matches
                                        the app (Drift's palette when it sets none, as make.py)
Writes store/media/promo.jpg (1600 x 900, the size X shows uncropped).
"""
import argparse, base64, glob, io, json, os, re, shutil, subprocess, sys
from PIL import Image
from playwright.sync_api import sync_playwright


def expo_config(repo):
    """expo config from app.json, or from app.config.js through the Expo CLI."""
    p = os.path.join(repo, 'app.json')
    if os.path.exists(p):
        e = json.load(open(p)).get('expo', {})
        if e.get('name'):
            return e
    x = 'bunx' if shutil.which('bunx') else 'npx'
    out = subprocess.run([x, 'expo', 'config', '--type', 'public', '--json'], cwd=repo,
                         capture_output=True, text=True, env={**os.environ, 'EXPO_OFFLINE': '1', 'CI': '1'})
    try:
        return json.loads(out.stdout[out.stdout.index('{'):])
    except ValueError:
        sys.exit('could not read the expo config: ' + out.stderr[-400:])

ap = argparse.ArgumentParser()
ap.add_argument('repo')
ap.add_argument('--frames', help='comma separated frame names (without .png), default first three')
ap.add_argument('--tagline')
ap.add_argument('--out')
a = ap.parse_args()
R = os.path.abspath(a.repo)


def load(path, default=None):
    p = os.path.join(R, path)
    return json.load(open(p)) if os.path.exists(p) else default


expo = expo_config(R)
name = expo.get('name') or os.path.basename(R)
store = load('store.config.json', {}) or {}
info = store.get('apple', {}).get('info', {}).get('en-US', {})
tagline = a.tagline or info.get('subtitle') or ''
if re.search(r'[‐-―]|\w-\w|\s-\s', tagline):
    sys.exit(f'tagline has a dash: {tagline}')
scenes = load('scripts/screenshots/scenes.json', {}) or {}
# Same palette rules as make.py: the app's themes and ink, or Drift's when it sets none.
themes = scenes.get('themes') or {
    'dark': {'bg': 'linear-gradient(180deg,#04061A 0%,#0B1030 55%,#1B2160 100%)', 'glow': 'rgba(125,147,255,.38)'},
}
first = (scenes.get('scenes') or [{}])[0].get('theme')
theme = themes.get(first) or themes.get('dark') or next(iter(themes.values()))
bg = theme.get('bg')
glow = theme.get('glow', 'rgba(255,255,255,.10)')
ink = scenes.get('ink') or {'title': '#F1F3FF', 'accent': '#F7C873', 'sub': 'rgba(205,213,255,.8)'}
accent = ink.get('accent', '#F7C873')
title_ink = ink.get('title', '#FFFFFF')
sub_ink = ink.get('sub', title_ink)
# The pill text has to read on the accent: dark text on a light accent, light on a dark one.
_h = accent.lstrip('#')
_lum = sum(int(_h[i:i + 2], 16) * w for i, w in ((0, .299), (2, .587), (4, .114))) if len(_h) == 6 else 255
pill_ink = '#111' if _lum > 140 else '#fff'
pill_bg = accent if accent.upper() not in ('#FFFFFF', '#FFF') else title_ink
pill_ink = '#fff' if pill_bg is title_ink else pill_ink

shots = sorted(glob.glob(os.path.join(R, 'store/screenshots/6.9-inch/*.png')))
if a.frames:
    want = a.frames.split(',')
    shots = [s for w in want for s in shots if os.path.basename(s)[:-4] == w]
shots = shots[:3]
if len(shots) < 3:
    sys.exit(f'need three frames in store/screenshots/6.9-inch, found {len(shots)}. Run the screenshots script first.')


def b64(path, maxh=None):
    im = Image.open(path).convert('RGB')
    if maxh and im.height > maxh:
        im = im.resize((round(im.width * maxh / im.height), maxh), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=92)
    return base64.b64encode(buf.getvalue()).decode()


icon_path = os.path.join(R, expo.get('icon', './assets/images/icon.png'))
icon = f'<img class="icon" src="data:image/jpeg;base64,{b64(icon_path, 256)}">' if os.path.exists(icon_path) else ''
frames = ''.join(f'<img class="f f{i}" src="data:image/jpeg;base64,{b64(s, 1600)}">' for i, s in enumerate(shots))

html = f'''<!doctype html><html><head><style>
*{{margin:0;box-sizing:border-box}}
body{{width:1600px;height:900px;overflow:hidden;font-family:Inter,"Helvetica Neue",Arial,sans-serif;background:{bg};position:relative;color:{title_ink}}}
.glow{{position:absolute;right:-10%;top:10%;width:80%;height:120%;background:radial-gradient(closest-side,{glow},transparent)}}
.left{{position:absolute;left:72px;top:0;bottom:0;width:440px;display:flex;flex-direction:column;justify-content:center}}
.icon{{width:96px;height:96px;border-radius:22px;margin-bottom:28px;box-shadow:0 10px 30px rgba(0,0,0,.35)}}
h1{{font-size:68px;font-weight:700;letter-spacing:-1.5px;line-height:1}}
p{{margin-top:18px;font-size:24px;line-height:1.35;color:{sub_ink};max-width:400px}}
.pill{{margin-top:30px;align-self:flex-start;background:{pill_bg};color:{pill_ink};font-weight:700;font-size:18px;padding:10px 20px;border-radius:999px}}
.foot{{position:absolute;left:72px;bottom:36px;font-size:13px;letter-spacing:3px;color:{sub_ink};opacity:.8;font-weight:600}}
.f{{position:absolute;height:700px;border-radius:30px;box-shadow:0 30px 80px rgba(0,0,0,.45)}}
.f0{{right:779px;top:120px}} .f1{{right:410px;top:80px;height:740px}} .f2{{right:60px;top:120px}}
</style></head><body><div class="glow"></div>
<div class="left">{icon}<h1>{name}</h1><p>{tagline}</p><div class="pill">Free on the App Store</div></div>
<div class="foot">GRAYSMITH LABS</div>{frames}</body></html>'''

out = a.out or os.path.join(R, 'store/media/promo.jpg')
os.makedirs(os.path.dirname(out), exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1600, 'height': 900})
    pg.set_content(html); pg.wait_for_timeout(400)
    png = pg.screenshot()
    b.close()
Image.open(io.BytesIO(png)).convert('RGB').save(out, 'JPEG', quality=88)
print('wrote', out)
