#!/usr/bin/env python3
"""
App Store screenshots for iPhone and iPad, from the Expo web export.
Graysmith Labs kit, first built for Drift 1.18.0. Copy to scripts/screenshots/.

    bun run screenshots            (exports both builds, then runs this)
    python3 scripts/screenshots/make.py <web-free> <web-premium>

Writes, all checked into the repo so the listing can push them:
  store/screenshots/6.9-inch/*.png   1320 x 2868, App Store slot APP_IPHONE_67
  store/screenshots/ipad-13/*.png    2064 x 2752, App Store slot APP_IPAD_PRO_3GEN_129
  store/paywall-review.png           raw paywall for subscription review

Scenes and captions live in scenes.json next to this file. Captions: six words or
fewer in the title, no dashes. The web export renders with Inter instead of SF and
shows no ads, which is expected.
"""
import base64, datetime, functools, http.server, io, json, os, re, sys, threading
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
cfg = json.load(open(os.path.join(HERE, 'scenes.json')))
webs = {'free': sys.argv[1], 'premium': sys.argv[2]}
OUT = os.path.join(ROOT, 'store')
RAW = os.path.join(OUT, 'raw')
DEVICES = {
    # name: viewport (points), scale, output folder, canvas size, phone frame box
    'iphone': ((440, 956), 3, 'screenshots/6.9-inch', (1320, 2868)),
    # Apple requires the medium display set (6.1 to 6.3 inch) as well; without it
    # App Store Connect keeps whatever old set is there. SayBright is iPhone only.
    'iphone61': ((402, 874), 3, 'screenshots/6.1-inch', (1206, 2622)),
}
for _, _, folder, _ in DEVICES.values():
    os.makedirs(os.path.join(OUT, folder), exist_ok=True)
os.makedirs(RAW, exist_ok=True)

SCROLL = "y => { for (const el of document.querySelectorAll('*')) { if (el.scrollHeight > el.clientHeight + 5 && getComputedStyle(el).overflowY !== 'visible') el.scrollTop = y; } }"


def serve(directory):
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def translate_path(self, path):
            p = super().translate_path(path.split('?')[0])
            if not os.path.exists(p) and os.path.exists(p + '.html'):
                return p + '.html'
            if not os.path.exists(p):
                return os.path.join(directory, 'index.html')
            return p

    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=directory))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{srv.server_address[1]}'


urls = {k: serve(v) for k, v in webs.items()}
PRICE = re.compile(r"(?i)\bfree\b|\btrial\b|\bprice|\bdiscount|\bsale\b|\bdeal\b|[$€£¥]\s?\d|\d+\s?% off|/\s?(mo|month|yr|year|week)\b|per (month|year|week)")
errors = []


def capture(browser, scene, device):
    (w, h), scale, _, _ = DEVICES[device]
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=scale)
    page = ctx.new_page()
    # set_fixed_time, not clock.install: a frozen timer queue stalls font loading
    # in SayBright, so the web build never leaves its splash.
    page.clock.set_fixed_time(datetime.datetime.fromisoformat(scene.get('clock', cfg['clock'])))
    page.set_default_timeout(6000)
    page.on('pageerror', lambda e: errors.append(f"{scene['name']}: {e}"))
    base = urls[scene.get('build', 'free')]
    page.goto(base + '/__seed')
    storage = {} if scene.get('fresh') else cfg['storage']
    page.evaluate("s => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }", storage)
    page.goto(base + scene.get('path', '/'))
    page.wait_for_timeout(5500)  # the animated splash runs first
    for step in scene.get('steps', []):
        if 'click' in step:
            page.get_by_text(step['click'], exact=True).first.click()
        if 'role' in step:
            page.get_by_role('button', name=step['role'], exact=True).first.click()
        if 'drag' in step:
            for _ in range(step['drag']):
                y, x = h * 0.6, w * 0.75
                page.mouse.move(x, y)
                page.mouse.down()
                for k in range(1, 11):
                    page.mouse.move(x - k * 30, y)
                    page.wait_for_timeout(16)
                page.mouse.up()
                page.wait_for_timeout(700)
        if 'scrollTop' in step:
            page.evaluate(SCROLL, step['scrollTop'])
        page.wait_for_timeout(step.get('wait', 600))
    if scene is not cfg['paywall']:
        # Guideline 2.3.7: store screenshots may not mention price, free, trials or
        # discounts (Drift 1.18.0 was rejected for a paywall frame). Check every word
        # on screen, not just the caption, so a "Try free" chip is caught too.
        hit = PRICE.search(page.evaluate('document.body.innerText'))
        if hit:
            sys.exit(f"{scene['name']} ({device}) shows price text on screen: {hit.group(0)!r}. "
                     "Use the premium build or another screen.")
    path = os.path.join(RAW, f"{device}-{scene['name']}.png")
    page.screenshot(path=path)
    ctx.close()
    return path


# Caption backdrops come from the app's palette in scenes.json ("themes"); these
# are Drift's, used only when an app has not set its own.
THEMES = cfg.get('themes') or {
    'dark': {'bg': 'linear-gradient(180deg,#04061A 0%,#0B1030 55%,#1B2160 100%)', 'glow': 'rgba(125,147,255,.38)'},
    'deep': {'bg': 'linear-gradient(180deg,#080C27 0%,#141A4A 60%,#2A2C6E 100%)', 'glow': 'rgba(247,200,115,.26)'},
}
INK = cfg.get('ink', {'title': '#F1F3FF', 'accent': '#F7C873', 'sub': 'rgba(205,213,255,.8)'})

TPL = '''<!doctype html><html><head><style>
*{margin:0;box-sizing:border-box}
body{width:{{W}}px;height:{{H}}px;overflow:hidden;font-family:"Inter",sans-serif;background:{{bg}};position:relative}
.glow{position:absolute;left:-20%;right:-20%;top:45%;height:80%;background:radial-gradient(closest-side,{{glow}},transparent)}
.stars{position:absolute;inset:0;background-image:radial-gradient(2px 2px at 12% 18%,#dce3ff 60%,transparent),radial-gradient(1.6px 1.6px at 78% 9%,#dce3ff 60%,transparent),radial-gradient(2px 2px at 88% 24%,#dce3ff 60%,transparent),radial-gradient(1.4px 1.4px at 30% 7%,#dce3ff 60%,transparent),radial-gradient(1.6px 1.6px at 55% 15%,#dce3ff 60%,transparent),radial-gradient(1.2px 1.2px at 6% 30%,#dce3ff 60%,transparent);opacity:{{stars}}}
.cap{position:absolute;top:{{capTop}}px;left:8%;right:8%;text-align:center}
h1{font-size:{{h1}}px;line-height:1.08;font-weight:700;letter-spacing:-1.5px;color:{{inkTitle}}}
h1 b{color:{{inkAccent}};font-weight:700}
p{margin-top:{{pGap}}px;font-size:{{p}}px;line-height:1.3;font-weight:500;color:{{inkSub}}}
.phone{position:absolute;left:{{px}}px;right:{{px}}px;top:{{py}}px;bottom:-{{overhang}}px;border-radius:{{r}}px;background:{{frame}};padding:{{bez}}px;box-shadow:0 0 0 3px rgba(174,187,255,.18),0 60px 140px rgba(0,0,0,.5)}
.screen{width:100%;height:100%;border-radius:{{ri}}px;overflow:hidden;background:#04061A}
.screen img{width:100%;display:block}
</style></head><body><div class="glow"></div><div class="stars"></div>
<div class="cap"><h1>{{title}}</h1><p>{{subtitle}}</p></div>
<div class="phone"><div class="screen"><img src="data:image/png;base64,{{img}}"></div></div>
</body></html>'''

LAYOUT = {
    'iphone': dict(capTop=190, h1=104, p=48, pGap=30, px=110, py=640, overhang=120, r=110, ri=88, bez=22),
    'iphone61': dict(capTop=174, h1=95, p=44, pGap=27, px=100, py=585, overhang=110, r=100, ri=80, bez=20),
}


def highlight(title):
    # Gold on the last word, the warm accent the app uses for Premium and the moon
    words = title.split(' ')
    return ' '.join(words[:-1] + [f'<b>{words[-1]}</b>'])


def compose(browser, scene, device, raw_path):
    _, _, folder, (W, H) = DEVICES[device]
    buf = io.BytesIO()
    Image.open(raw_path).convert('RGB').save(buf, 'PNG')
    html = TPL
    vals = {'stars': 0.7, 'frame': '#151A3A', 'W': W, 'H': H, 'title': highlight(scene['title']), 'subtitle': scene['subtitle'],
            'img': base64.b64encode(buf.getvalue()).decode(), **THEMES[scene['theme']], **LAYOUT[device],
            'inkTitle': INK['title'], 'inkAccent': INK['accent'], 'inkSub': INK['sub']}
    for k, v in vals.items():
        html = html.replace('{{' + k + '}}', str(v))
    page = browser.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
    page.set_content(html)
    page.wait_for_timeout(300)
    out = os.path.join(OUT, folder, scene['name'] + '.png')
    page.screenshot(path=out)
    page.close()
    Image.open(out).convert('RGB').save(out)  # App Store rejects alpha
    assert Image.open(out).size == (W, H), out
    print('wrote', os.path.relpath(out, ROOT))


for scene in cfg['scenes']:
    for field in ('title', 'subtitle'):
        if re.search(r'[\u2010-\u2015]|\w-\w|\s-\s', scene[field]):
            sys.exit(f"{scene['name']} {field} has a dash: {scene[field]}")
        if PRICE.search(scene[field]):
            sys.exit(f"{scene['name']} {field} mentions price, free or a trial (Guideline 2.3.7): {scene[field]}")
    if any(p in scene.get('path', '') for p in ('/paywall', '/premium')):
        sys.exit(f"{scene['name']} captures the paywall; that belongs only in cfg paywall, never the listing")
    if len(scene['title'].split()) > 6:
        sys.exit(f"{scene['name']} title is over six words: {scene['title']}")

with sync_playwright() as p:
    browser = p.chromium.launch()
    for scene in cfg['scenes']:
        for device in DEVICES:
            compose(browser, scene, device, capture(browser, scene, device))
    raw = capture(browser, cfg['paywall'], 'iphone')
    Image.open(raw).convert('RGB').save(os.path.join(OUT, 'paywall-review.png'))
    print('wrote store/paywall-review.png')
    browser.close()

if errors:
    print('page errors:', *errors[:8], sep='\n  ')
    sys.exit(1)
