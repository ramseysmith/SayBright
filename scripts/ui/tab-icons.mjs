#!/usr/bin/env node
// Custom bottom tab bar icons, the TubTender way (Ramsey, Nov 19 2026). One plain SVG per
// tab in design/tabs/ is the editable source; this tool judges them and writes the
// react-native-svg component. The rules live in HQ .claude/skills/tab-icons/SKILL.md.
//
//   node scripts/ui/tab-icons.mjs sheet [--theme "bg,active,muted"]... [--out file.png]
//   node scripts/ui/tab-icons.mjs port  [--out src/components/art/TabIcons.tsx]
//   node scripts/ui/tab-icons.mjs check
//
// SVG grammar (28 point grid, viewBox "0 0 28 28"). Every shape is a rounded 2.2 stroke
// in the tab tint unless it says otherwise:
//   fill="currentColor"   solid detail in the tint (no stroke unless stroke is given)
//   data-focus="soft"     body that fills at 18% of the tint when the tab is selected
//   data-focus="solid"    fills fully with the tint when selected (TubTender's slider knobs)
//   data-focus="show"     drawn only when selected
//   opacity="0.55"        a quieter detail, like TubTender's third test pad
// Only path, rect, circle, ellipse and line, no groups or transforms. An XML comment
// before a shape becomes the comment in the component. <svg data-label="Today"> names
// the tab on the sheet.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';

export const GRID = 28;
export const WEIGHT = 2.2;
export const SOFT = 0.18;
const SHAPES = ['path', 'rect', 'circle', 'ellipse', 'line'];
const STOCK = /@expo\/vector-icons|react-native-vector-icons|lucide-react-native|expo-symbols|react-native-heroicons|@tabler\/icons|phosphor-react-native/;
const OUT_CANDIDATES = ['src/illustrations/TabIcons.tsx', 'src/components/art/TabIcons.tsx'];

export function parseSvg(text, name = 'icon') {
  const problems = [];
  const root = /<svg\b([^>]*)>/.exec(text);
  if (!root) return { name, shapes: [], problems: [`${name}: no <svg> root`] };
  const rootAttrs = attrs(root[1]);
  if (rootAttrs.viewBox !== `0 0 ${GRID} ${GRID}`) problems.push(`${name}: viewBox must be "0 0 ${GRID} ${GRID}" (got "${rootAttrs.viewBox || 'none'}")`);
  if (/<(g|use|defs|linearGradient|radialGradient|text|image|polygon|polyline)\b/.test(text))
    problems.push(`${name}: only path, rect, circle, ellipse and line; no groups, gradients, text or images`);
  if (/transform=/.test(text)) problems.push(`${name}: no transforms; draw on the grid`);
  const shapes = [];
  const re = new RegExp(`<!--([\\s\\S]*?)-->|<(${SHAPES.join('|')})\\b([^>]*?)\\/?>`, 'g');
  let note = null;
  for (const m of text.slice(root.index + root[0].length).matchAll(re)) {
    if (m[1] !== undefined) {
      note = m[1].trim();
      continue;
    }
    const a = attrs(m[3]);
    const fill = a.fill;
    if (fill && fill !== 'none' && fill !== 'currentColor') problems.push(`${name}: fill "${fill}"; use currentColor so the tab bar sets the color`);
    if (a.stroke && a.stroke !== 'none' && a.stroke !== 'currentColor') problems.push(`${name}: stroke "${a.stroke}"; use currentColor`);
    if (a['stroke-width'] && Number(a['stroke-width']) !== WEIGHT) problems.push(`${name}: stroke-width ${a['stroke-width']}; the family uses ${WEIGHT} everywhere`);
    if (a['data-focus'] && !['soft', 'solid', 'show'].includes(a['data-focus'])) problems.push(`${name}: data-focus "${a['data-focus']}" (soft, solid or show)`);
    shapes.push({ tag: m[2], a, note });
    note = null;
  }
  if (!shapes.length) problems.push(`${name}: no shapes`);
  if (!shapes.some((s) => s.a['data-focus'])) problems.push(`${name}: nothing changes when the tab is selected; give the body data-focus="soft"`);
  for (const s of shapes) {
    const nums = numbersOf(s);
    if (nums.some((n) => n < 1 || n > GRID - 1)) problems.push(`${name}: a ${s.tag} reaches outside 1 to ${GRID - 1}; keep the art inside the grid`);
  }
  return { name, label: rootAttrs['data-label'] || title(name), shapes, problems };
}

function attrs(src) {
  const out = {};
  for (const m of String(src).matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function numbersOf(s) {
  const a = s.a;
  if (s.tag === 'rect') return [+a.x, +a.y, +a.x + +a.width, +a.y + +a.height];
  if (s.tag === 'circle') return [+a.cx - +a.r, +a.cx + +a.r, +a.cy - +a.r, +a.cy + +a.r];
  if (s.tag === 'ellipse') return [+a.cx - +a.rx, +a.cx + +a.rx, +a.cy - +a.ry, +a.cy + +a.ry];
  if (s.tag === 'line') return [+a.x1, +a.y1, +a.x2, +a.y2];
  // path: only absolute M, L, H, V, C, S, Q and Z paths are judged (arc flags and
  // relative moves are not coordinates)
  if (/[a-zA]/.test(a.d.replace(/[eE]/g, '').replace(/[MLHVCSQZ]/g, ''))) return [];
  return (a.d.match(/-?\d*\.?\d+/g) || []).map(Number);
}

function title(name) {
  return name.replace(/(^|[-_])(\w)/g, (_, s, c) => (s ? ' ' : '') + c.toUpperCase());
}

export function loadSet(dir) {
  const src = join(dir, 'design/tabs');
  if (!existsSync(src)) return { icons: [], problems: [`no design/tabs folder; draw one SVG per tab there first`], hash: '' };
  const files = readdirSync(src)
    .filter((f) => f.endsWith('.svg'))
    .sort();
  const order = existsSync(join(src, 'order.json')) ? JSON.parse(readFileSync(join(src, 'order.json'), 'utf8')) : null;
  const icons = files.map((f) => parseSvg(readFileSync(join(src, f), 'utf8'), basename(f, '.svg')));
  if (order) icons.sort((x, y) => order.indexOf(x.name) - order.indexOf(y.name));
  const hash = createHash('sha256')
    .update(files.map((f) => f + readFileSync(join(src, f), 'utf8')).join('\n'))
    .digest('hex')
    .slice(0, 12);
  const problems = icons.flatMap((i) => i.problems);
  const solid = icons.filter((i) => i.shapes.some((s) => s.a.fill === 'currentColor' || s.a['data-focus'] === 'solid')).length;
  if (icons.length && solid * 2 < icons.length)
    problems.push(`only ${solid} of ${icons.length} icons have a solid detail; the family pairs outlines with solid accents (TubTender's pads, dot, knobs)`);
  return { icons, problems, hash };
}

// ---- port: SVG to react-native-svg ----

const CAMEL = (k) => k.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const COMPONENT = { path: 'Path', rect: 'Rect', circle: 'Circle', ellipse: 'Ellipse', line: 'Line' };

function jsxShape(s, indent) {
  const a = { ...s.a };
  const focus = a['data-focus'];
  delete a['data-focus'];
  const solid = a.fill === 'currentColor';
  const props = [];
  for (const [k, v] of Object.entries(a)) {
    if (['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'].includes(k)) continue;
    props.push(/^-?\d*\.?\d+$/.test(v) ? `${CAMEL(k)}={${Number(v)}}` : `${CAMEL(k)}="${v}"`);
  }
  if (solid) props.push('fill={color}');
  else if (focus === 'soft') props.push('fill={color}', 'fillOpacity={soft}');
  else if (focus === 'solid') props.push('fill={fill}');
  else props.push('fill="none"');
  const stroked = a.stroke ? a.stroke !== 'none' : !solid;
  if (stroked) props.push('stroke={color}', 'strokeWidth={w}', 'strokeLinecap="round"', 'strokeLinejoin="round"');
  if (focus === 'show') props.push('opacity={focused ? 1 : 0}');
  const pad = ' '.repeat(indent);
  const note = s.note ? `${pad}{/* ${s.note.replace(/\*\//g, '')} */}\n` : '';
  return `${note}${pad}<${COMPONENT[s.tag]} ${props.join(' ')} />`;
}

export function port(set) {
  const names = set.icons.map((i) => i.name);
  const uses = (f) => set.icons.some((i) => i.shapes.some((s) => s.a['data-focus'] === f));
  const used = new Set(set.icons.flatMap((i) => i.shapes.map((s) => COMPONENT[s.tag])));
  const body = set.icons
    .map((i) => {
      return `      {name === '${i.name}' ? (\n        <>\n${i.shapes.map((s) => jsxShape(s, 10)).join('\n')}\n        </>\n      ) : null}`;
    })
    .join('\n');
  return `// Generated by scripts/ui/tab-icons.mjs port from design/tabs/*.svg (source ${set.hash}).
// Edit the SVGs and run the port again; HQ .claude/skills/tab-icons/SKILL.md has the rules.
import Svg, { ${[...used].sort().join(', ')} } from 'react-native-svg';

/**
 * The app's own tab bar glyphs, drawn on a ${GRID} point grid with ${WEIGHT} rounded strokes,
 * the same grammar as TubTender's. One tint color each, so the tab bar colors them; the
 * selected glyph fills its body softly and its solid details carry the motif.
 */
export type TabIconName = ${names.map((n) => `'${n}'`).join(' | ')};

export const TAB_ICON_NAMES: TabIconName[] = [${names.map((n) => `'${n}'`).join(', ')}];

interface Props {
  name: TabIconName;
  color: string;
  focused?: boolean;
  size?: number;
}

export function TabIcon({ name, color, focused = false, size = ${GRID} }: Props) {
${uses('solid') ? "  const fill = focused ? color : 'none';\n" : ''}${uses('soft') ? `  const soft = focused ? ${SOFT} : 0;\n` : ''}  const w = ${WEIGHT};
  return (
    <Svg width={size} height={size} viewBox="0 0 ${GRID} ${GRID}">
${body}
    </Svg>
  );
}

export default TabIcon;
`;
}

function findOut(dir, given) {
  if (given) return join(dir, given);
  for (const c of OUT_CANDIDATES) if (existsSync(join(dir, c))) return join(dir, c);
  return join(dir, OUT_CANDIDATES[1]);
}

function prettier(dir, file) {
  const bin = join(dir, 'node_modules/.bin/prettier');
  if (!existsSync(bin)) return;
  try {
    execFileSync(bin, ['--write', file], { cwd: dir, stdio: 'ignore' });
  } catch {}
}

// ---- check: the doctor ----

export function tabLayouts(dir) {
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d, { withFileTypes: true })) {
      if (f.name === 'node_modules' || f.name.startsWith('.')) continue;
      const p = join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.[jt]sx$/.test(f.name) && /tabBarIcon/.test(readFileSync(p, 'utf8'))) out.push(p);
    }
  };
  for (const d of ['src', 'app']) walk(join(dir, d));
  for (const f of ['App.tsx', 'App.js']) if (existsSync(join(dir, f)) && /tabBarIcon/.test(readFileSync(join(dir, f), 'utf8'))) out.push(join(dir, f));
  return out;
}

export function lintTabLayout(text) {
  const problems = [];
  if (!/tabBarIcon/.test(text)) return problems;
  const m = STOCK.exec(text);
  if (m) problems.push(`tab bar icons come from ${m[0]}; draw the app's own set (tab-icons skill: design/tabs, then scripts/ui/tab-icons.mjs port)`);
  if (/tabBarIcon[\s\S]{0,200}<(AppBadge|Glyph|Ionicons|MaterialIcons|Feather|FontAwesome|SymbolView)\b/.test(text))
    problems.push('tabBarIcon renders a non tab glyph; use <TabIcon name color focused size /> from the generated TabIcons.tsx');
  if (!/TabIcon\b/.test(text)) problems.push('tabBarIcon does not render TabIcon (generated from design/tabs by scripts/ui/tab-icons.mjs port)');
  return problems;
}

export function check(dir) {
  const problems = [];
  const layouts = tabLayouts(dir);
  if (!layouts.length) return { problems, skipped: 'no bottom tab bar' };
  const set = loadSet(dir);
  // TubTender's set was drawn by hand before this tool (it is the reference): a
  // TabIcons.tsx with no design/tabs passes as long as the bar renders it.
  const handDrawn = !existsSync(join(dir, 'design/tabs')) && OUT_CANDIDATES.some((c) => existsSync(join(dir, c)));
  if (!handDrawn) problems.push(...set.problems);
  for (const f of layouts) for (const p of lintTabLayout(readFileSync(f, 'utf8'))) problems.push(`${relative(dir, f)}: ${p}`);
  if (set.icons.length) {
    const out = findOut(dir);
    if (!existsSync(out)) problems.push(`${relative(dir, out)} is missing; run node scripts/ui/tab-icons.mjs port`);
    else if (!readFileSync(out, 'utf8').includes(`(source ${set.hash})`))
      problems.push(`${relative(dir, out)} is stale against design/tabs; run node scripts/ui/tab-icons.mjs port`);
  }
  return { problems, icons: handDrawn ? 'hand drawn' : set.icons.length, layouts: layouts.map((f) => relative(dir, f)) };
}

// ---- sheet: judge the family as a set and in a real bar ----

function svgFor(icon, color, focused, size) {
  const shapes = icon.shapes
    .map((s) => {
      const a = { ...s.a };
      const focus = a['data-focus'];
      delete a['data-focus'];
      const solid = a.fill === 'currentColor';
      const out = { ...a };
      out.fill = solid ? color : focus === 'soft' && focused ? color : focus === 'solid' && focused ? color : 'none';
      if (focus === 'soft' && focused) out['fill-opacity'] = SOFT;
      const stroked = a.stroke ? a.stroke !== 'none' : !solid;
      if (stroked) Object.assign(out, { stroke: color, 'stroke-width': WEIGHT, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      else out.stroke = 'none';
      if (focus === 'show' && !focused) out.opacity = 0;
      return `<${s.tag} ${Object.entries(out)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')}/>`;
    })
    .join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${GRID} ${GRID}">${shapes}</svg>`;
}

function chrome() {
  const fixed = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];
  for (const c of fixed) if (c && existsSync(c)) return c;
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  if (existsSync(cache))
    for (const d of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      const p = join(cache, d, 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium');
      if (existsSync(p)) return p;
    }
  return null;
}

export function sheetHtml(icons, themes) {
  const blocks = themes.map(({ bg, active, muted }) => {
    const sizes = icons
      .map(
        (i) => `<div class="cell"><div class="row">${[22, 28, 56].map((s) => svgFor(i, muted, false, s)).join('')}${[22, 28, 56]
          .map((s) => svgFor(i, active, true, s))
          .join('')}</div><p style="color:${muted}">${i.name}</p></div>`,
      )
      .join('');
    const bar = (width, on) =>
      `<div class="bar" style="width:${width}px;border-top:1px solid ${muted}33">${icons
        .map(
          (i, k) =>
            `<div class="tab">${svgFor(i, k === on ? active : muted, k === on, 26)}<span style="color:${k === on ? active : muted}">${i.label}</span></div>`,
        )
        .join('')}</div><p class="cap" style="color:${muted}">${width} points, ${icons[on]?.label} selected</p>`;
    return `<section style="background:${bg}"><div class="grid">${sizes}</div>${bar(375, 0)}${bar(440, icons.length - 1)}</section>`;
  });
  return `<!doctype html><html><head><style>
body{margin:0;font:12px -apple-system,system-ui,sans-serif}
section{padding:24px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:20px}
.cell{border:1px solid rgba(128,128,128,.25);border-radius:14px;padding:12px}
.row{display:flex;align-items:end;gap:14px}
p{margin:8px 0 0}
.bar{display:flex;justify-content:space-around;padding:7px 0 4px;margin-top:14px}
.tab{display:flex;flex-direction:column;align-items:center;gap:3px;font-weight:600;font-size:10px}
.cap{font-size:11px;opacity:.8}
</style></head><body>${blocks.join('')}</body></html>`;
}

function sheet(dir, args) {
  const set = loadSet(dir);
  if (!set.icons.length) throw new Error(set.problems.join('\n'));
  const themes = (args.theme.length ? args.theme : ['#141414,#FF8A3D,#8A8A8A']).map((t) => {
    const [bg, active, muted] = t.split(',');
    return { bg, active, muted };
  });
  const html = join(tmpdir(), `tab-icons-${process.pid}.html`);
  writeFileSync(html, sheetHtml(set.icons, themes));
  const out = args.out || join(dir, 'build/tab-icons.png');
  mkdirSync(dirname(out), { recursive: true });
  const bin = chrome();
  if (!bin) throw new Error('no Chrome or Chromium found; set CHROME to its binary');
  const rows = Math.ceil(set.icons.length / 2);
  const height = themes.length * (48 + rows * 112 + 2 * 92);
  execFileSync(bin, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=720,${height}`, `--screenshot=${out}`, `file://${html}`], {
    stdio: 'ignore',
  });
  // Images cost tokens on every later turn: keep the sheet at 900 pixels or less.
  try {
    execFileSync('sips', ['-Z', '900', out], { stdio: 'ignore' });
  } catch {}
  for (const p of set.problems) console.log('WARN', p);
  console.log(`wrote ${out} (${set.icons.length} icons, ${themes.length} theme${themes.length > 1 ? 's' : ''}); look at it once, at this size`);
}

function parseArgs(argv) {
  const out = { theme: [], out: null, dir: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--theme') out.theme.push(argv[++i]);
    else if (argv[i] === '--out') out.out = argv[++i];
    else if (argv[i] === '--dir') out.dir = argv[++i];
  }
  return out;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const dir = args.dir;
  if (cmd === 'sheet') return sheet(dir, args);
  if (cmd === 'port') {
    const set = loadSet(dir);
    if (set.problems.length) {
      for (const p of set.problems) console.log('FAIL', p);
      process.exit(1);
    }
    const out = findOut(dir, args.out);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, port(set));
    prettier(dir, out);
    console.log(`wrote ${relative(dir, out)}: ${set.icons.map((i) => i.name).join(', ')}`);
    return;
  }
  if (cmd === 'check') {
    const r = check(dir);
    if (r.skipped) return console.log(`tab icons: PASS (${r.skipped})`);
    for (const p of r.problems) console.log('FAIL', p);
    console.log(r.problems.length ? `tab icons: FAIL (${r.problems.length})` : `tab icons: PASS (${r.icons}${typeof r.icons === 'number' ? ' icons' : ''}, ${r.layouts.join(', ')})`);
    process.exit(r.problems.length ? 1 : 0);
  }
  console.log('usage: node scripts/ui/tab-icons.mjs sheet|port|check [--dir app] [--theme "bg,active,muted"] [--out path]');
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
