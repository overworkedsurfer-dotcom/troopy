#!/usr/bin/env node
// Build index.html (the arcade hub) from lab data.
//   inputs: lab/results/summary.json (bot runs), lab/scores.json (critic + my scores + final ranking + notes)
//   copies a screenshot per game to assets/shots/<id>.png
// usage: node lab/buildhub.js [--tag v2]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const TAG = opt('tag', '');

const summary = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'summary' + (TAG ? '.' + TAG : '') + '.json'), 'utf8'));
const scores = JSON.parse(fs.readFileSync(path.join(__dirname, 'scores.json'), 'utf8'));

fs.mkdirSync(path.join(ROOT, 'assets', 'shots'), { recursive: true });
const games = [];
for (const g of scores.games) {
  const s = summary.games[g.id];
  const shotSrc = path.join(__dirname, 'shots', g.id, (g.shot || '2-mid') + '.png');
  if (fs.existsSync(shotSrc)) fs.copyFileSync(shotSrc, path.join(ROOT, 'assets', 'shots', g.id + '.png'));
  games.push({
    ...g,
    signals: s ? s.signals : null,
    bots: s ? Object.fromEntries(Object.entries(s.bots).map(([b, d]) => [b, { median: d.medianScore, cv: d.cv, len: d.medianLenS, cap: d.capHits, scores: d.scores, lens: d.lens }])) : null,
  });
}
games.sort((a, b) => a.rank - b.rank);
// bonus game(s): built after the competition at the user's request; lab-measured, not ranked (no critic pass)
const bonus = [];
for (const b of (scores.bonus || [])) {
  const s = summary.games[b.id];
  const shotSrc = path.join(__dirname, 'shots', b.id, (b.shot || '2-mid') + '.png');
  if (fs.existsSync(shotSrc)) fs.copyFileSync(shotSrc, path.join(ROOT, 'assets', 'shots', b.id + '.png'));
  bonus.push({ ...b, signals: s ? s.signals : null });
}
const DATA = { generated: summary.date, winner: scores.winner, games, bonus, links: scores.links || {} };

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Fun Lab</title>
<meta name="description" content="10 small browser games and a bonus roguelike, 6,000+ seeded bot sessions, two blind critics, an audio lab, and one winner.">
<style>
:root{
  --bg:#0c0d14; --surface:#14151f; --surface-2:#1c1e2b; --line:#2a2c3b; --ink:#f0efec; --ink-2:#c3c2b7; --muted:#8d8b98;
  --accent:#ffd34d; --accent-ink:#111; --good:#0ca30c; --critical:#d03b3b;
  --s-random:#3987e5; --s-heuristic:#d95926; --s-smart:#199e70;
  --radius:14px; --gutter:16px;
  color-scheme:dark;
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:inherit}
.wrap{max-width:1180px;margin:0 auto;padding-left:max(var(--gutter),env(safe-area-inset-left,0px));padding-right:max(var(--gutter),env(safe-area-inset-right,0px))}
header.top{padding:40px 0 18px}
.kicker{font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;color:var(--muted);text-transform:uppercase}
h1{font-size:clamp(34px,6vw,64px);line-height:1;margin:10px 0 10px;letter-spacing:-.02em}
h1 span{color:var(--accent)}
.lede{color:var(--ink-2);max-width:760px;margin:0}
.nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.nav a{border:1px solid var(--line);border-radius:999px;padding:6px 14px;text-decoration:none;color:var(--ink-2);font-size:14px}
.nav a:hover{border-color:var(--ink-2);color:var(--ink)}
.winner{margin:22px 0 34px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:0;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}
.winner .shot{background:#000;display:flex;align-items:center;justify-content:center;min-height:240px}
.winner .shot img{width:100%;height:100%;object-fit:contain;display:block;max-height:440px}
.winner .body{padding:26px 26px 24px}
.crown{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:var(--accent-ink);font-weight:800;border-radius:999px;padding:4px 12px;font-size:13px;letter-spacing:.06em}
.winner h2{font-size:40px;margin:12px 0 4px;letter-spacing:-.01em}
.winner p{color:var(--ink-2)}
.btn{display:inline-block;background:var(--accent);color:var(--accent-ink);font-weight:800;text-decoration:none;border-radius:10px;padding:10px 18px;margin-top:6px}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line);font-weight:600}
h3.sec{font-size:22px;margin:38px 0 6px}
.sec-sub{color:var(--muted);margin:0 0 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column;transition:transform .15s ease,border-color .15s ease}
.tile:hover{transform:translateY(-3px);border-color:#44475c}
.tile .thumb{position:relative;aspect-ratio:4/3;background:#000;overflow:hidden}
.tile .thumb img{width:100%;height:100%;object-fit:cover;display:block}
.rank{position:absolute;top:10px;left:10px;background:rgba(10,10,16,.85);border:1px solid var(--line);border-radius:10px;padding:2px 9px;font:800 15px/1.5 ui-monospace,Menlo,monospace}
.rank.r1{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.tile .info{padding:14px 14px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
.tile h4{margin:0;font-size:19px;letter-spacing:.02em}
.genre{font:600 11px/1 ui-monospace,Menlo,monospace;color:var(--muted);letter-spacing:.12em;text-transform:uppercase}
.tile p{margin:0;color:var(--ink-2);font-size:14px;flex:1}
.scores{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0 2px}
.scores div{background:var(--surface-2);border-radius:8px;padding:6px 4px;text-align:center}
.scores b{display:block;font-size:17px;font-variant-numeric:tabular-nums}
.scores span{font-size:10px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}
.hs{font-size:13px;color:var(--muted)}
.hs b{color:var(--ink);font-variant-numeric:tabular-nums}
.play{background:var(--ink);color:#111;text-decoration:none;font-weight:800;border-radius:9px;padding:7px 14px;font-size:14px}
.play:hover{background:var(--accent)}
/* charts */
.extras{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:-14px 0 8px}
.extra{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;text-decoration:none}
.extra:hover{border-color:#44475c}
.extra b{font-size:15px;color:var(--ink)}
.extra span{font-size:13px;color:var(--ink-2)}
.extra i{font-style:normal;font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.tag{display:inline-block;font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;padding:4px 7px;border-radius:6px;background:var(--surface-2);color:var(--ink-2);border:1px solid var(--line)}
.legend{display:flex;gap:18px;flex-wrap:wrap;margin:0 0 12px;color:var(--ink-2);font-size:14px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}
.charts{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
.chart{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px 14px 8px}
.chart h5{margin:0 0 2px;font-size:15px}
.chart .meta{color:var(--muted);font-size:12px;margin-bottom:4px}
.chart svg{width:100%;height:auto;display:block;overflow:visible}
.chart svg text{fill:var(--muted);font:11px system-ui,sans-serif}
.chart svg .lab{fill:var(--ink-2);font-size:12px}
.chart svg .dot{stroke:var(--surface);stroke-width:2}
.chart svg .dot:hover,.chart svg .hit:hover+.dot{stroke:var(--ink)}
.chart svg .grid{stroke:var(--line);stroke-width:1}
.chart.wide{max-width:760px}
.chart svg .r1{fill:var(--surface);stroke:var(--muted);stroke-width:2}
.chart svg .r2{fill:var(--accent);stroke:var(--surface);stroke-width:2}
.chart svg .bar{stroke:var(--line);stroke-width:2}
.chart svg .up{stroke:var(--accent);stroke-opacity:.45;stroke-width:3}
.chart svg .med{stroke:var(--ink);stroke-width:2;stroke-linecap:round}
#tip{position:fixed;pointer-events:none;background:#0b0b10;border:1px solid var(--line);border-radius:8px;padding:6px 9px;font-size:12px;color:var(--ink-2);display:none;z-index:9;white-space:nowrap}
#tip b{color:var(--ink);font-size:14px;margin-right:6px}
details.table{margin-top:16px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:10px 14px}
details.table summary{cursor:pointer;color:var(--ink-2)}
.tbl{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13px;margin-top:10px}
th,td{text-align:right;padding:6px 8px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums;white-space:nowrap}
th:first-child,td:first-child{text-align:left}
th{color:var(--muted);font-weight:600}
footer{color:var(--muted);font-size:13px;padding:40px 0 60px}
@media (max-width:760px){.winner{grid-template-columns:1fr}.winner h2{font-size:32px}.charts{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
<header class="top">
  <div class="kicker">The Fun Lab · ${new Date(summary.date).toISOString().slice(0, 10)}</div>
  <h1>Ten games. <span>One winner.</span></h1>
  <p class="lede">I researched what makes games fun and turned it into a 15-point rubric. I built 10 one-file browser games and played them all myself. Over 6,000 seeded bot sessions were played by random, heuristic, lookahead, button-masher and human-limited bots. Two blind critics that never saw the code scored the games. I reworked the weakest games, measured everything again, and recorded each game's actual sound. Every tile below is playable with keyboard or touch.</p>
  <nav class="nav"><a href="#games">Games</a><a href="#bonus">Bonus roguelike</a><a href="#iterate">Before → after</a><a href="#charts">Score distributions</a><a href="https://github.com/overworkedsurfer-dotcom/troopy/blob/claude/fervent-cray-xjrm74/REPORT.md">Full report</a><a href="https://github.com/overworkedsurfer-dotcom/troopy/blob/claude/fervent-cray-xjrm74/research/FUN.md">The rubric (FUN.md)</a><a href="https://github.com/overworkedsurfer-dotcom/troopy/blob/claude/fervent-cray-xjrm74/DECISIONS.md">Decisions</a><a href="https://github.com/overworkedsurfer-dotcom/troopy/blob/claude/fervent-cray-xjrm74/lab/notes/critic.md">Critic notes</a></nav>
</header>
<section id="winner"></section>
<section class="extras" id="extras"></section>
<h3 class="sec" id="games">The arcade, ranked</h3>
<p class="sec-sub">Final = 0.30 × bot + 0.35 × blind critic + 0.35 × my own play (all out of 10). Your best scores are stored locally in your browser.</p>
<div class="grid" id="grid"></div>
<h3 class="sec" id="bonus">Bonus: a roguelike, on request</h3>
<p class="sec-sub">Built after the competition, so it isn't ranked: no critic has played it. It went through the same lab (contract, determinism, 150 bot sessions, masher and human-model bots, audio).</p>
<div class="grid" id="bonusgrid"></div>
<h3 class="sec" id="iterate">Round 1 → Round 2: what iteration bought</h3>
<p class="sec-sub">The final score for each game before and after Phase 4. Hollow dot: round 1 (first build). Filled dot: round 2 (after bug fixes, a hard rework of the bottom 4, and a polish pass on the top 3). The final score combines the bots, the blind critic and me.</p>
<div class="chart wide" id="dumbbell"></div>
<h3 class="sec" id="charts">Score distributions per bot</h3>
<p class="sec-sub">Each dot is one seeded session (50 per bot per game), plotted on a log scale. The white tick marks the median. A wide gap between random and smart means your choices matter. A wide spread across seeds means runs vary.</p>
<div class="legend"><span><i style="background:var(--s-random)"></i>random bot</span><span><i style="background:var(--s-heuristic)"></i>heuristic bot</span><span><i style="background:var(--s-smart)"></i>smart (lookahead) bot</span></div>
<div class="charts" id="chartgrid"></div>
<details class="table"><summary>Table view: bot medians, session length, skill gap</summary><div class="tbl"><table id="tbl"></table></div></details>
<footer>Every game is one self-contained HTML file using vanilla JS and canvas, with WebAudio sound and no external assets. Every game exposes a deterministic <code>window.__game</code> bot API. The lab harness is in <code>lab/</code>.</footer>
</div>
<div id="tip"></div>
<script id="data" type="application/json">${JSON.stringify(DATA).replace(/</g, '\\u003c')}</script>
<script>
(() => {
const D = JSON.parse(document.getElementById('data').textContent);
const el = (t, a = {}, kids = []) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else e.setAttribute(k, v); } for (const c of [].concat(kids)) if (c) e.append(c); return e; };
const best = id => { try { return +localStorage.getItem('funlab.' + id + '.best') || 0; } catch (e) { return 0; } };
const f1 = x => (x == null || isNaN(x)) ? '–' : (Math.round(x * 10) / 10).toFixed(1);
const fmt = x => x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e4 ? Math.round(x / 1e3) + 'k' : x >= 1e3 ? (x / 1e3).toFixed(1) + 'k' : String(Math.round(x));

// winner
const W = D.games.find(g => g.id === D.winner.id);
if (W) {
  const w = document.getElementById('winner');
  w.append(el('div', { class: 'winner' }, [
    el('div', { class: 'shot' }, el('img', { src: 'assets/shots/' + W.id + '.png', alt: W.name + ' screenshot' })),
    el('div', { class: 'body' }, [
      el('span', { class: 'crown', text: '★ WINNER' }),
      el('h2', { text: W.name }),
      el('div', { class: 'genre', text: W.genre }),
      el('p', { text: W.pitch }),
      el('p', { text: D.winner.why }),
      el('a', { class: 'btn', href: 'games/' + W.id + '.html', text: 'Play ' + W.name + ' →' }),
      document.createTextNode(' '),
      el('a', { class: 'btn ghost', href: 'https://github.com/overworkedsurfer-dotcom/troopy/blob/claude/fervent-cray-xjrm74/REPORT.md', text: 'Read the receipts' }),
    ]),
  ]));
}
// follow-up extras strip
{
  const ex = document.getElementById('extras');
  const items = [
    ['games/pipwalk.html#daily', 'New', 'PIPWALK daily dungeon', "Today's seed is the same for everyone. Ogre, Lich and Mimic bosses, new faces and unlockable dice."],
    ['games/emberdeep.html', 'Bonus', 'EMBERDEEP', 'A roguelike where your health is your light. Get hit and the world goes dark.'],
  ];
  if (D.links.playtest) items.push([D.links.playtest, 'For testers', 'Human playtest', 'Twelve minutes with sound on. Your runs and ratings calibrate the bots.']);
  for (const [href, k, t, d] of items) ex.append(el('a', { class: 'extra', href }, [el('i', { text: k }), el('b', { text: t }), el('span', { text: d })]));
}
// bonus tiles
{
  const bg = document.getElementById('bonusgrid');
  for (const g of D.bonus) {
    const b = best(g.id), sg = g.signals || {};
    bg.append(el('article', { class: 'tile' }, [
      el('a', { class: 'thumb', href: 'games/' + g.id + '.html', 'aria-label': 'Play ' + g.name }, [el('img', { src: 'assets/shots/' + g.id + '.png', alt: g.name + ' screenshot', loading: 'lazy' }), el('span', { class: 'rank', text: 'BONUS' })]),
      el('div', { class: 'info' }, [
        el('div', { class: 'genre', text: g.genre }), el('h4', { text: g.name }), el('p', { text: g.pitch }),
        el('div', { class: 'row' }, [el('span', { class: 'tag', text: 'skill gap ×' + fmt(sg.skillRatio || 0) }), el('span', { class: 'tag', text: 'smart ' + Math.round(sg.smartMedianLenS || 0) + ' s' }), el('span', { class: 'tag', text: 'mine ' + f1(g.mine) })]),
        el('div', { class: 'row' }, [el('span', { class: 'hs' }, [document.createTextNode('your best '), el('b', { text: b ? String(b) : '—' })]), el('a', { class: 'play', href: 'games/' + g.id + '.html', text: 'Play ▶' })]),
      ]),
    ]));
  }
}
// tiles
const grid = document.getElementById('grid');
for (const g of D.games) {
  const b = best(g.id);
  grid.append(el('article', { class: 'tile' }, [
    el('a', { class: 'thumb', href: 'games/' + g.id + '.html', 'aria-label': 'Play ' + g.name }, [
      el('img', { src: 'assets/shots/' + g.id + '.png', alt: g.name + ' screenshot', loading: 'lazy' }),
      el('span', { class: 'rank' + (g.rank === 1 ? ' r1' : ''), text: '#' + g.rank }),
    ]),
    el('div', { class: 'info' }, [
      el('div', { class: 'genre', text: g.genre }),
      el('h4', { text: g.name }),
      el('p', { text: g.pitch }),
      el('div', { class: 'scores' }, [
        el('div', {}, [el('b', { text: f1(g.final) }), el('span', { text: 'final' })]),
        el('div', {}, [el('b', { text: f1(g.critic) }), el('span', { text: 'critic' })]),
        el('div', {}, [el('b', { text: f1(g.mine) }), el('span', { text: 'mine' })]),
        el('div', {}, [el('b', { text: f1(g.bot) }), el('span', { text: 'bots' })]),
      ]),
      el('div', { class: 'row' }, [
        el('span', { class: 'hs' }, [document.createTextNode('your best '), el('b', { text: b ? String(b) : '—' })]),
        el('a', { class: 'play', href: 'games/' + g.id + '.html', text: 'Play ▶' }),
      ]),
    ]),
  ]));
}
// charts: strip plots on a log scale, one row per bot
const tip = document.getElementById('tip');
const BOTS = [['random', 'var(--s-random)'], ['heuristic', 'var(--s-heuristic)'], ['smart', 'var(--s-smart)']];
const NS = 'http://www.w3.org/2000/svg';
const S = (t, a) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
const cg = document.getElementById('chartgrid');
for (const g of D.games) {
  if (!g.bots) continue;
  const all = BOTS.flatMap(([b]) => (g.bots[b] ? g.bots[b].scores : []));
  const lo = 1, hi = Math.max(10, ...all) * 1.15;
  const Wd = 340, L = 74, R = 12, top = 8, rowH = 34, H = top + rowH * 3 + 26;
  const x = v => L + (Math.log10(Math.max(lo, v + 1)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * (Wd - L - R);
  const svg = S('svg', { viewBox: '0 0 ' + Wd + ' ' + H, role: 'img', 'aria-label': g.name + ' score distribution by bot' });
  // grid + ticks at powers of ten
  for (let p = 0; Math.pow(10, p) <= hi; p++) {
    const v = Math.pow(10, p) - 1, xx = x(v);
    svg.append(S('line', { x1: xx, x2: xx, y1: top, y2: top + rowH * 3, class: 'grid' }));
    const t = S('text', { x: xx, y: H - 8, 'text-anchor': 'middle' }); t.textContent = fmt(Math.pow(10, p)); svg.append(t);
  }
  BOTS.forEach(([b, col], i) => {
    const d = g.bots[b]; if (!d) return;
    const cy = top + rowH * i + rowH / 2;
    const lab = S('text', { x: 0, y: cy + 4, class: 'lab' }); lab.textContent = b; svg.append(lab);
    // deterministic jitter by index
    d.scores.forEach((v, k) => {
      const jy = cy + (((k * 37) % 11) - 5) * 1.6;
      const hit = S('circle', { cx: x(v), cy: jy, r: 9, fill: 'transparent', class: 'hit' });
      const dot = S('circle', { cx: x(v), cy: jy, r: 4, fill: col, class: 'dot', 'fill-opacity': '0.85' });
      const show = e => { tip.style.display = 'block'; tip.innerHTML = ''; tip.append(el('b', { text: String(v) }), document.createTextNode(b + ' · seed ' + (k + 1) + ' · ' + (d.lens ? d.lens[k] + 's' : ''))); tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 30) + 'px'; };
      hit.addEventListener('pointermove', show); hit.addEventListener('pointerleave', () => tip.style.display = 'none');
      svg.append(hit, dot);
    });
    const m = x(d.median);
    svg.append(S('line', { x1: m, x2: m, y1: cy - 11, y2: cy + 11, class: 'med' }));
  });
  const sg = g.signals || {};
  cg.append(el('div', { class: 'chart' }, [
    el('h5', { text: '#' + g.rank + ' ' + g.name }),
    el('div', { class: 'meta', text: 'skill gap ×' + fmt(sg.skillRatio || 0) + ' · smart median ' + Math.round(sg.smartMedianLenS || 0) + 's · CV ' + f1(sg.smartCV) + ' · cap hits ' + (sg.notSolved ? 0 : 'YES') }),
    svg,
  ]));
}
// dumbbell: round-1 final -> round-2 final
(() => {
  const host = document.getElementById('dumbbell');
  const G = D.games.slice().sort((a, b) => b.final - a.final);
  const Wd = 720, L = 110, R = 54, top = 10, rowH = 30, H = top + rowH * G.length + 28;
  const lo = 5, hi = 10, x = v => L + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (Wd - L - R);
  const svg = S('svg', { viewBox: '0 0 ' + Wd + ' ' + H, role: 'img', 'aria-label': 'Final score per game, round 1 versus round 2' });
  for (let v = lo; v <= hi; v++) { const xx = x(v); svg.append(S('line', { x1: xx, x2: xx, y1: top, y2: top + rowH * G.length, class: 'grid' })); const t = S('text', { x: xx, y: H - 8, 'text-anchor': 'middle' }); t.textContent = v; svg.append(t); }
  G.forEach((g, i) => {
    const cy = top + rowH * i + rowH / 2;
    const lab = S('text', { x: 0, y: cy + 4, class: 'lab' }); lab.textContent = g.name; svg.append(lab);
    if (g.final1 != null) {
      svg.append(S('line', { x1: x(g.final1), x2: x(g.final), y1: cy, y2: cy, class: g.final >= g.final1 ? 'up' : 'bar' }));
      const a = S('circle', { cx: x(g.final1), cy, r: 6, class: 'r1' }); svg.append(a);
    }
    const b = S('circle', { cx: x(g.final), cy, r: 6, class: 'r2' }); svg.append(b);
    const d = S('text', { x: Wd - R + 10, y: cy + 4, class: 'lab' }); d.textContent = (g.final >= (g.final1 ?? g.final) ? '+' : '') + f1(g.final - (g.final1 ?? g.final)); svg.append(d);
    const hit = S('rect', { x: L - 6, y: cy - rowH / 2, width: Wd - L - R + 12, height: rowH, fill: 'transparent' });
    hit.addEventListener('pointermove', e => { tip.style.display = 'block'; tip.innerHTML = ''; tip.append(el('b', { text: f1(g.final) }), document.createTextNode(g.name + ' · round 1 ' + f1(g.final1) + ' (#' + g.rank1 + ') → round 2 #' + g.rank)); tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 30) + 'px'; });
    hit.addEventListener('pointerleave', () => tip.style.display = 'none');
    svg.append(hit);
  });
  host.append(el('h5', { text: 'Final score (0.30 bot + 0.35 critic + 0.35 mine), x-axis from 5 to 10' }),
    el('div', { class: 'legend' }, [el('span', {}, [el('i', { style: 'background:transparent;border:2px solid var(--muted)' }), document.createTextNode('round 1')]), el('span', {}, [el('i', { style: 'background:var(--accent)' }), document.createTextNode('round 2 (final)')])]), svg);
})();
// table
const tbl = document.getElementById('tbl');
const head = el('tr', {}, ['Game', 'random med', 'heuristic med', 'smart med', 'skill ×', 'smart len (s)', 'smart CV', 'bot /10', 'critic', 'mine', 'final', 'round-1 final'].map(h => el('th', { text: h })));
tbl.append(head);
for (const g of D.games) {
  const sg = g.signals || {}, B = g.bots || {};
  tbl.append(el('tr', {}, [g.name, fmt(B.random?.median ?? 0), fmt(B.heuristic?.median ?? 0), fmt(B.smart?.median ?? 0), fmt(sg.skillRatio || 0), Math.round(sg.smartMedianLenS || 0), f1(sg.smartCV), f1(g.bot), f1(g.critic), f1(g.mine), f1(g.final), f1(g.final1)].map(v => el('td', { text: String(v) }))));
}
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
// Artifact variant: same page without the document skeleton (the Artifact host adds it)
{
  const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
  const title = head.match(/<title>[\s\S]*?<\/title>/)[0], desc = head.match(/<meta name="description"[^>]*>/)[0], style = head.match(/<style>[\s\S]*?<\/style>/)[0];
  const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  fs.mkdirSync(path.join(__dirname, 'artifact'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'artifact', 'index.html'), title + '\n<meta name="claude:viewport-fit-sides" content="cover">\n' + desc + '\n' + style + '\n' + body);
}
console.log('wrote index.html with', games.length, 'games');
