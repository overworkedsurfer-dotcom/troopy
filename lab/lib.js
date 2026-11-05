// Shared helpers for the Fun Lab harness (Playwright + headless Chromium).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end('nf'); }
      rsp.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res({ srv, base: 'http://127.0.0.1:' + srv.address().port }));
  });
}

async function launch() {
  return chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
}

// Open a game page; collect console errors and page errors into errs[].
async function openGame(browser, base, id, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 900, height: 760 }, hasTouch: !!opts.touch, isMobile: !!opts.mobile, deviceScaleFactor: opts.dpr || 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  page.on('requestfailed', r => { if (!r.url().startsWith('data:')) errs.push('requestfailed: ' + r.url()); });
  await page.goto(base + '/games/' + id + '.html', { waitUntil: 'load' });
  await page.waitForTimeout(opts.settle || 300);
  return { ctx, page, errs };
}

function loadBots(id) {
  const f = path.join(__dirname, 'bots', id + '.js');
  delete require.cache[require.resolve(f)];
  const mod = require(f);
  const out = {};
  for (const [name, b] of Object.entries(mod.bots)) out[name] = { decisionMs: b.decisionMs || 100, src: b.decide.toString() };
  return out;
}

// Installed into the page once: defines window.__lab with a resumable session runner.
const LAB_PRELUDE = function () {
  if (window.__lab) return;
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  window.__lab = {
    start(botSrc, decisionMs, seed, botSalt) {
      const G = window.__game;
      // eslint-disable-next-line no-new-func
      const decide = (0, eval)('(' + botSrc + ')');
      G.reset(seed);
      this.s = { G, decide, decisionMs, rng: mulberry(seed * 9973 + botSalt), mem: {}, t: 0, inputs: 0, changes: 0, prev: 'none',
        lastScore: G.score(), lastScoreT: 0, maxGap: 0, scoreEvents: 0, wall: 0, diff0: (G.getState().difficulty ?? null), err: null };
    },
    advance(untilT, cap, wallLimit) {
      const s = this.s, G = s.G, w0 = performance.now();
      try {
        while (!G.isOver() && s.t < untilT && s.t < cap) {
          const a = s.decide(G, s.rng, s.mem);
          if (a != null) { G.input(a); if (a !== 'none') s.inputs++; if (a !== s.prev && a !== 'none') s.changes++; s.prev = a; }
          G.tick(s.decisionMs); s.t += s.decisionMs;
          const sc = G.score();
          if (sc > s.lastScore) { s.maxGap = Math.max(s.maxGap, s.t - s.lastScoreT); s.lastScoreT = s.t; s.scoreEvents++; }
          s.lastScore = sc;
          if (performance.now() - w0 > wallLimit) { s.err = 'wall-timeout'; break; }
        }
      } catch (e) { s.err = 'bot/game exception: ' + (e && e.stack || e); }
      s.wall += performance.now() - w0;
      return this.summary();
    },
    summary() {
      const s = this.s, G = s.G, st = G.getState();
      const over = G.isOver();
      const gap = Math.max(s.maxGap, s.t - s.lastScoreT);
      return { score: G.score(), ms: s.t, over, cause: over ? (st.cause || null) : null, inputs: s.inputs, changes: s.changes,
        apm: s.t > 0 ? s.changes / (s.t / 60000) : 0, maxScoreGapMs: gap, scoreEvents: s.scoreEvents,
        difficulty0: s.diff0, difficulty1: (st.difficulty ?? null), wallMs: Math.round(s.wall), err: s.err };
    },
  };
};

async function installLab(page) { await page.evaluate(LAB_PRELUDE); }

function stats(xs) {
  const a = xs.slice().sort((p, q) => p - q), n = a.length;
  if (!n) return { n: 0 };
  const q = p => { const i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
  const mean = a.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(a.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  return { n, min: a[0], p10: q(0.1), p25: q(0.25), median: q(0.5), p75: q(0.75), p90: q(0.9), max: a[n - 1], mean, sd, cv: mean ? sd / Math.abs(mean) : 0 };
}

module.exports = { ROOT, serve, launch, openGame, loadBots, installLab, stats };
