#!/usr/bin/env python3
"""
Demo video for one app, recorded from its Expo web export. Graysmith Labs kit
(templates/ui/media). It replays the same scenes the App Store screenshots use, so
the video always shows the current app with the same seeded data.

    python3 demo_video.py <app repo> <web-free> [<web-premium>] [--scenes 1-home,4-breathe] [--hold 1800]

Reads scripts/screenshots/scenes.json (clock, splashMs, storage, scenes and their
steps) and app.json, and seeds each scene the way the repo's make.py does: per scene
storage and clock, a "demo" object handed to the app as the window.__APP_DEMO__
global make.py names ("$signature" filled from cfg), the /__seed page and a fixed
clock when make.py uses them, and the drag, play and miss steps. Each scene is recorded in its own browser context, the splash is cut off,
steps are paced so a viewer can follow them, and the clips are joined with an end
card into store/media/demo.mp4 (1080 x 1920, H.264, no audio) plus
store/media/demo-poster.jpg. Needs Python 3 with Playwright and Pillow, and ffmpeg.
"""
import argparse, base64, datetime, functools, glob, http.server, io, json, os, re, shutil, subprocess, sys, tempfile, threading, time
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
ap.add_argument('web_free')
ap.add_argument('web_premium', nargs='?')
ap.add_argument('--scenes', help='comma separated scene names, default every scene')
ap.add_argument('--hold', type=int, default=1800, help='ms to hold on each scene after its steps')
ap.add_argument('--splash', type=int, default=None, help='ms the animated splash runs before the app is usable')
ap.add_argument('--out')
a = ap.parse_args()
R = os.path.abspath(a.repo)
cfg = json.load(open(os.path.join(R, 'scripts/screenshots/scenes.json')))
expo = expo_config(R)
name = expo.get('name') or os.path.basename(R)
W, H, SCALE = 440, 956, 2
make_src = ''
_mp = os.path.join(R, 'scripts/screenshots/make.py')
if os.path.exists(_mp):
    make_src = open(_mp).read()
_g = re.search(r'window\.(__[A-Z0-9_]+_DEMO__)', make_src)
DEMO_GLOBAL = cfg.get('demoGlobal') or (_g.group(1) if _g else None)
FIXED_CLOCK = cfg.get('clockMode') == 'fixed' or 'clock.set_fixed_time' in make_src
SEED_PATH = cfg.get('seedPath') or ('/__seed' if "'/__seed'" in make_src else '/')
SPLASH = cfg.get('splashMs')
SCROLL = "y => { for (const el of document.querySelectorAll('*')) { if (el.scrollHeight > el.clientHeight + 5 && getComputedStyle(el).overflowY !== 'visible') el.scrollTop = y; } }"


def serve(directory):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def translate_path(self, path):
            p = super().translate_path(path.split('?')[0])
            if not os.path.exists(p) and os.path.exists(p + '.html'):
                return p + '.html'
            if not os.path.exists(p):
                return os.path.join(directory, 'index.html')
            return p

    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=directory))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{srv.server_address[1]}'


urls = {'free': serve(os.path.abspath(a.web_free))}
if a.web_premium:
    urls['premium'] = serve(os.path.abspath(a.web_premium))
scenes = cfg['scenes']
if a.scenes:
    want = a.scenes.split(',')
    scenes = [s for w in want for s in scenes if s['name'] == w]
scenes = [s for s in scenes if s.get('build', 'free') in urls]
if not scenes:
    sys.exit('no scenes to record')

# Background for the letterbox and end card: the app's first scene theme, as make.py
# picks it (Drift's palette when scenes.json sets none).
themes = cfg.get('themes') or {'dark': {'bg': 'linear-gradient(180deg,#04061A 0%,#0B1030 55%,#1B2160 100%)'}}
theme = themes.get((cfg.get('scenes') or [{}])[0].get('theme')) or themes.get('dark') or next(iter(themes.values()))
END_BG = theme.get('bg', '#111214')
m = re.search(r'#[0-9A-Fa-f]{6}', END_BG)
BG = cfg.get('screenBg') or (m.group(0) if m else '#111214')
ink = cfg.get('ink') or {'title': '#F1F3FF', 'accent': '#F7C873'}
accent = ink.get('accent', '#F7C873')
title_ink = ink.get('title', '#FFFFFF')
_h = accent.lstrip('#')
_lum = sum(int(_h[i:i + 2], 16) * w for i, w in ((0, .299), (2, .587), (4, .114))) if len(_h) == 6 else 255
pill_bg, pill_ink = (title_ink, '#fff') if accent.upper() in ('#FFFFFF', '#FFF') else (accent, '#111' if _lum > 140 else '#fff')

tmp = tempfile.mkdtemp()
clips, errors = [], []


def record(browser, scene, idx):
    # Chrome's screencast gives frames at full device resolution (880 x 1912), which
    # Playwright's own video recorder does not, so the clip stays sharp at 1080p.
    ctx = browser.new_context(viewport={'width': W, 'height': H}, device_scale_factor=SCALE)
    page = ctx.new_page()
    clock = scene.get('clock', cfg.get('clock'))
    if clock:
        when = datetime.datetime.fromisoformat(clock)
        # SayBright: a frozen timer queue stalls font loading, so it uses a fixed time
        page.clock.set_fixed_time(when) if FIXED_CLOCK else page.clock.install(time=when)
    page.set_default_timeout(6000)
    # jsQR is expo-camera's web QR worker, fetched from a CDN; irrelevant here
    page.on('pageerror', lambda e: None if 'jsQR' in str(e) else errors.append(f"{scene['name']}: {e}"))
    if scene.get('demo') and DEMO_GLOBAL:
        demo = {k: (cfg.get('signature') if v == '$signature' else v) for k, v in scene['demo'].items()}
        page.add_init_script(f'window.{DEMO_GLOBAL} = ' + json.dumps(demo))
    base = urls[scene.get('build', 'free')]
    page.goto(base + SEED_PATH)
    storage = {} if scene.get('fresh') else {**cfg.get('storage', {}), **scene.get('storage', {})}
    page.evaluate("s => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }", storage)
    page.goto(base + scene.get('path', '/'))
    page.wait_for_timeout(a.splash or SPLASH or 5500)  # the splash is never recorded
    fdir = os.path.join(tmp, f'frames{idx}'); os.makedirs(fdir)
    frames = []
    cdp = ctx.new_cdp_session(page)

    def on_frame(ev):
        path = os.path.join(fdir, f'{len(frames):05d}.jpg')
        open(path, 'wb').write(base64.b64decode(ev['data']))
        frames.append((path, time.monotonic()))
        try:
            cdp.send('Page.screencastFrameAck', {'sessionId': ev['sessionId']})
        except Exception:
            pass

    cdp.on('Page.screencastFrame', on_frame)
    cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 90, 'maxWidth': W * SCALE, 'maxHeight': H * SCALE})
    page.wait_for_timeout(700)  # let the viewer see where the scene starts
    for step in scene.get('steps') or []:
        if 'click' in step:
            page.get_by_text(step['click'], exact=True).first.click()
        if 'role' in step:
            page.get_by_role('button', name=step['role'], exact=True).first.click()
        if 'drag' in step:
            # SayBright: swipe a card to the left, step['drag'] times
            for _ in range(step['drag']):
                y, x = H * 0.6, W * 0.75
                page.mouse.move(x, y)
                page.mouse.down()
                for k in range(1, 11):
                    page.mouse.move(x - k * 30, y)
                    page.wait_for_timeout(16)
                page.mouse.up()
                page.wait_for_timeout(700)
        if 'play' in step or 'miss' in step:
            # BlitzTap: tap the option matching the target (play) or one that does not (miss)
            for _ in range(step.get('play', 1)):
                target = page.get_by_label(re.compile('^Match target: ')).first.get_attribute('aria-label')[len('Match target: '):]
                for b in page.get_by_role('button').all():
                    lab = b.get_attribute('aria-label') or ''
                    hit = lab == target or (' ' not in target and lab.split(' ')[0] == target and len(lab.split(' ')) == 2)
                    if ('miss' in step) != hit and ('miss' not in step or (len(lab.split(' ')) == 2 and lab.split(' ')[0] != target)):
                        b.click()
                        break
                page.wait_for_timeout(step.get('gap', 420))
        if 'scrollTop' in step:
            page.evaluate(SCROLL, step['scrollTop'])
        page.wait_for_timeout(max(step.get('wait', 600), 700))
    page.wait_for_timeout(a.hold)
    end = time.monotonic()
    cdp.send('Page.stopScreencast')
    ctx.close()
    if not frames:
        sys.exit(f"{scene['name']}: no frames captured")
    lst = os.path.join(tmp, f'frames{idx}.txt')
    with open(lst, 'w') as f:
        for i, (path, t) in enumerate(frames):
            nxt = frames[i + 1][1] if i + 1 < len(frames) else end
            f.write(f"file '{path}'\nduration {max(nxt - t, 0.034):.3f}\n")
        f.write(f"file '{frames[-1][0]}'\n")
    out = os.path.join(tmp, f'clip{idx}.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-vf', f'scale=-2:1920,pad=1080:1920:(ow-iw)/2:0:color={BG},fps=30,format=yuv420p',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-an', out], check=True)
    return out


def end_card(browser):
    icon_path = os.path.join(R, expo.get('icon', './assets/images/icon.png'))
    icon = ''
    if os.path.exists(icon_path):
        im = Image.open(icon_path).convert('RGB').resize((320, 320), Image.LANCZOS)
        buf = io.BytesIO(); im.save(buf, 'PNG')
        icon = f'<img src="data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}">'
    html = f'''<!doctype html><html><body style="margin:0;width:1080px;height:1920px;background:{END_BG};display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Inter,Helvetica,Arial,sans-serif;color:{title_ink}">
    <div style="border-radius:72px;overflow:hidden;width:320px;height:320px;box-shadow:0 20px 60px rgba(0,0,0,.4)">{icon}</div>
    <div style="font-size:110px;font-weight:700;margin-top:56px;letter-spacing:-2px">{name}</div>
    <div style="margin-top:40px;background:{pill_bg};color:{pill_ink};font-weight:700;font-size:44px;padding:22px 48px;border-radius:999px">Free on the App Store</div>
    </body></html>'''
    page = browser.new_page(viewport={'width': 1080, 'height': 1920})
    page.set_content(html); page.wait_for_timeout(300)
    png = os.path.join(tmp, 'end.png'); page.screenshot(path=png); page.close()
    out = os.path.join(tmp, 'end.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-i', png, '-t', '2.5', '-vf', 'fps=30,format=yuv420p',
                    '-c:v', 'libx264', '-crf', '20', out], check=True)
    return out


with sync_playwright() as p:
    browser = p.chromium.launch()
    for i, scene in enumerate(scenes):
        clips.append(record(browser, scene, i))
        print('recorded', scene['name'])
    clips.append(end_card(browser))
    browser.close()

out = a.out or os.path.join(R, 'store/media/demo.mp4')
os.makedirs(os.path.dirname(out), exist_ok=True)
lst = os.path.join(tmp, 'list.txt')
open(lst, 'w').write(''.join(f"file '{c}'\n" for c in clips))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', out], check=True)
poster = os.path.join(os.path.dirname(out), 'demo-poster.jpg')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '1.5', '-i', out, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '4', poster], check=True)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out],
                           capture_output=True, text=True).stdout.strip())
shutil.rmtree(tmp, ignore_errors=True)
print(f'wrote {out} ({dur:.1f}s) and {poster}')
if dur > 140:
    print('warning: X caps videos at 140 seconds; pass fewer --scenes')
if errors:
    print('page errors:', *errors[:8], sep='\n  ')
    sys.exit(1)
