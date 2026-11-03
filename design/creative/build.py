#!/usr/bin/env python3
"""SayBright creative asset art (App Store header and search results).

Writes design/creative/backdrop.svg (3840 x 2560 dawn panorama: the icon's sky
from rose to apricot, a sun rising on the indigo horizon line with soft rays,
drifting clouds and layered rose hills) and design/creative/mark.svg (BrightMark:
the icon's speech bubble with the sun, on a warm halo). make_creative.py composes
them with the headline, the category glyphs and a real screen. Colors come from
src/theme/colors.ts. Seeded, so reruns are identical.
"""
import math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 3840, 2560
HZ = H * .86          # horizon line, the icon's indigo stroke
SX = 1870              # sun on the horizon, left of the search screen
rnd = random.Random(11)


def rays():
    out = []
    n = 15
    for i in range(n):
        a = math.pi + math.pi * (i + .5) / n          # upper half only
        da = math.pi / n * .32
        r = H * 1.25
        x1, y1 = SX + r * math.cos(a - da), HZ + r * math.sin(a - da)
        x2, y2 = SX + r * math.cos(a + da), HZ + r * math.sin(a + da)
        out.append(f'<path d="M{SX:.0f} {HZ:.0f} L{x1:.0f} {y1:.0f} L{x2:.0f} {y2:.0f} Z" fill="url(#ray)" opacity="{rnd.uniform(.5, .9):.2f}"/>')
    return '\n'.join(out)


def cloud(cx, cy, s, op):
    """A soft cumulus: overlapping puffs on a flat base."""
    puffs = []
    for k in range(7):
        dx = (k - 3) * 70 * s + rnd.uniform(-20, 20) * s
        r = (120 - abs(k - 3) * 22 + rnd.uniform(-12, 12)) * s
        puffs.append(f'<circle cx="{cx + dx:.0f}" cy="{cy - r * .45:.0f}" r="{r:.0f}"/>')
    base = f'<rect x="{cx - 260 * s:.0f}" y="{cy - 60 * s:.0f}" width="{520 * s:.0f}" height="{80 * s:.0f}" rx="{40 * s:.0f}"/>'
    return f'<g fill="#FFF8F0" opacity="{op}" filter="url(#soft)">{"".join(puffs)}{base}</g>'


def ridge(base, amp, waves, seed):
    r = random.Random(seed)
    ph = [r.uniform(0, 6.28) for _ in waves]
    pts = []
    for i in range(0, 97):
        x = W * i / 96
        y = base + sum(amp * a * math.sin(x / W * math.pi * 2 * f + p) for (f, a), p in zip(waves, ph))
        pts.append(f'{x:.0f},{y:.0f}')
    return 'M0,' + str(H) + ' L' + ' L'.join(pts) + f' L{W},{H} Z'


def sparkles():
    out = []
    for _ in range(26):
        x, y, s = rnd.uniform(0, W), rnd.uniform(H * .2, H * .78), rnd.uniform(9, 20)
        out.append(f'<path d="M{x:.0f} {y-s:.0f}Q{x:.0f} {y:.0f} {x+s:.0f} {y:.0f}Q{x:.0f} {y:.0f} {x:.0f} {y+s:.0f}Q{x:.0f} {y:.0f} {x-s:.0f} {y:.0f}Q{x:.0f} {y:.0f} {x:.0f} {y-s:.0f}Z" fill="#FFF8F0" opacity="{rnd.uniform(.45, .85):.2f}"/>')
    return '\n'.join(out)


clouds = '\n'.join([
    cloud(W * .12, H * .52, 1.5, .55), cloud(W * .86, H * .47, 1.7, .55),
    cloud(W * .30, H * .70, 1.1, .5), cloud(W * .72, H * .72, 1.2, .5),
    cloud(W * .04, H * .78, 1.3, .6), cloud(W * .97, H * .80, 1.2, .6),
    cloud(W * .55, H * .30, .9, .35), cloud(W * .22, H * .25, .8, .3),
])

backdrop = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<defs>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EE6A8C"/><stop offset=".38" stop-color="#FF8F6A"/><stop offset=".72" stop-color="#FFC56E"/><stop offset=".86" stop-color="#FFE3C4"/><stop offset="1" stop-color="#FFC9AE"/></linearGradient>
 <radialGradient id="glow" cx="{SX}" cy="{HZ}" r="{W*.55}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF6E6" stop-opacity=".9"/><stop offset=".35" stop-color="#FFE08A" stop-opacity=".35"/><stop offset="1" stop-color="#FFE08A" stop-opacity="0"/></radialGradient>
 <radialGradient id="ray" cx="{SX}" cy="{HZ}" r="{H*1.25}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF6E6" stop-opacity=".55"/><stop offset=".7" stop-color="#FFF6E6" stop-opacity="0"/></radialGradient>
 <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC24B"/><stop offset="1" stop-color="#F58A1F"/></linearGradient>
 <linearGradient id="hillA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2789A"/><stop offset="1" stop-color="#EE6A8C"/></linearGradient>
 <linearGradient id="hillB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D96390"/><stop offset="1" stop-color="#B84F86"/></linearGradient>
 <linearGradient id="hillC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E5AA8"/><stop offset="1" stop-color="#5E3F96"/></linearGradient>
 <filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
 <filter id="blur" x="-5%" y="-200%" width="110%" height="500%"><feGaussianBlur stdDeviation="16"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky)"/>
{rays()}
<rect width="{W}" height="{H}" fill="url(#glow)"/>
{sparkles()}
{clouds}
<circle cx="{SX}" cy="{HZ}" r="300" fill="#FFE08A" opacity=".35" filter="url(#soft)"/>
<path d="M{SX-215} {HZ} A215 215 0 0 1 {SX+215} {HZ} Z" fill="url(#sun)"/>
<path d="M0 {HZ} H{W}" stroke="#5B4BC4" stroke-width="40" opacity=".35" filter="url(#blur)"/>
<path d="M0 {HZ} H{W}" stroke="#5B4BC4" stroke-width="16" opacity=".85"/>
<path d="{ridge(HZ + 60, 40, [(1.4, 1), (3.3, .45)], 1)}" fill="url(#hillA)" opacity=".92"/>
<path d="{ridge(HZ + 150, 46, [(1.9, 1), (4.1, .4)], 2)}" fill="url(#hillB)"/>
<path d="{ridge(HZ + 250, 38, [(1.2, 1), (2.7, .5)], 3)}" fill="url(#hillC)"/>
</svg>'''

# BrightMark from design/icon/icon.svg without its square sky: the bubble, the
# sun on the indigo horizon and its three rays, on a soft cream and gold halo.
mark = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs>
 <radialGradient id="halo" cx="512" cy="512" r="512" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF6E6" stop-opacity=".85"/><stop offset=".45" stop-color="#FFE08A" stop-opacity=".3"/><stop offset="1" stop-color="#FFE08A" stop-opacity="0"/></radialGradient>
 <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC24B"/><stop offset="1" stop-color="#F58A1F"/></linearGradient>
 <linearGradient id="bubble" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFCF7"/><stop offset="1" stop-color="#FFF0E2"/></linearGradient>
 <filter id="drop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#2A1E45" flood-opacity=".22"/></filter>
</defs>
<circle cx="512" cy="512" r="512" fill="url(#halo)"/>
<g transform="translate(512 512) scale(.86) translate(-512 -537)">
 <path filter="url(#drop)" d="M310 262 H714 A118 118 0 0 1 832 380 V598 A118 118 0 0 1 714 716 H420 L300 812 L326 716 H310 A118 118 0 0 1 192 598 V380 A118 118 0 0 1 310 262 Z" fill="url(#bubble)"/>
 <g stroke="#F59A2A" stroke-width="34" stroke-linecap="round" fill="none"><path d="M512 336 V384"/><path d="M378 398 L410 430"/><path d="M646 398 L614 430"/></g>
 <path d="M376 590 A136 136 0 0 1 648 590 Z" fill="url(#sun)"/>
 <path d="M322 590 H702" stroke="#5B4BC4" stroke-width="30" stroke-linecap="round"/>
 <path d="M400 644 H624" stroke="#5B4BC4" stroke-width="24" stroke-linecap="round" opacity="0.45"/>
</g>
</svg>'''

open(os.path.join(HERE, 'backdrop.svg'), 'w').write(backdrop)
open(os.path.join(HERE, 'mark.svg'), 'w').write(mark)
print('wrote design/creative/backdrop.svg and mark.svg')
