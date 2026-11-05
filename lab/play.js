#!/usr/bin/env node
// Interactive, time-stepped play server: lets a human-like agent play a game with REAL key/pointer
// events while sim time only advances on request (so you can "think" between moves).
//
//   node lab/play.js [--port 8765] [--out lab/play]
//
// Endpoints (GET, all return JSON):
//   /open?game=<id>&seed=<n>        load game, take "first look" screenshot in real-time mode, then switch to stepped mode
//   /step?keys=ArrowLeft+Space&ms=300[&hold=1][&shot=name]
//                                   key down for each key, advance sim ms, key up (unless hold=1); optional screenshot
//   /release                        release all held keys
//   /wait?ms=500[&shot=name]        advance sim without input
//   /tap?x=0.5&y=0.8&ms=120[&shot=name]   pointer (mouse) down at canvas-fraction coords, advance ms, up
//   /touch?x=0.5&y=0.8[&shot=name]  a touchscreen tap at canvas-fraction coords (then advance 50ms)
//   /drag?x1=..&y1=..&x2=..&y2=..&ms=200[&shot=name]  pointer drag over ms of sim time
//   /shot?name=foo                  screenshot (canvas) -> path
//   /status                         { t, score, over, cause, best? }
//   /restart                        press Space after game over (waits out the lockout)
//   /quit                           close everything
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { serve, launch } = require('./lib');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PORT = +opt('port', 8765), OUT = path.resolve(opt('out', path.join(__dirname, 'play')));
fs.mkdirSync(OUT, { recursive: true });

let browser, base, srv, ctx, page, errs = [], held = new Set(), game = null, shotN = 0;

async function status() {
  if (!page) return { error: 'no game open' };
  const s = await page.evaluate(() => { const g = window.__game, st = g.getState(); return { t: Math.round(st.t), score: g.score(), over: g.isOver(), cause: st.cause || null }; });
  s.consoleErrors = errs.length; if (errs.length) s.lastError = errs[errs.length - 1];
  return s;
}
async function advance(ms) {
  // advance in ~frame-sized slices, rendering between, so FX animate and held keys are sampled every step
  let left = +ms || 0;
  while (left > 0) { const d = Math.min(50, left); await page.evaluate(d => { window.__game.tick(d); }, d); left -= d; }
  await page.evaluate(() => window.__game.render());
}
async function shot(name) {
  const file = path.join(OUT, `${game}-${String(++shotN).padStart(3, '0')}-${(name || 'shot').replace(/[^\w-]/g, '')}.png`);
  await page.evaluate(() => window.__game.render());
  await page.locator('canvas').first().screenshot({ path: file });
  return file;
}
async function canvasPoint(fx, fy) {
  const b = await page.locator('canvas').first().boundingBox();
  return [b.x + b.width * fx, b.y + b.height * fy];
}

async function handle(u) {
  const q = Object.fromEntries(u.searchParams.entries());
  switch (u.pathname) {
    case '/open': {
      if (ctx) await ctx.close();
      errs = []; held.clear(); shotN = 0; game = q.game;
      ctx = await browser.newContext({ viewport: { width: +q.w || 900, height: +q.h || 760 }, hasTouch: q.touch === '1' });
      page = await ctx.newPage();
      page.on('pageerror', e => errs.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
      await page.goto(base + '/games/' + game + '.html');
      await page.waitForTimeout(1200);
      const first = await shot('firstlook');
      await page.evaluate(seed => window.__game.reset(seed), +q.seed || 1);
      await page.evaluate(() => window.__game.render());
      return { ok: true, firstLook: first, note: 'now in stepped mode: time only moves via /step, /wait, /tap', ...(await status()) };
    }
    case '/step': {
      const keys = (q.keys || '').split(/[+,]/).filter(Boolean);
      for (const k of keys) { await page.keyboard.down(k); held.add(k); }
      await advance(q.ms || 250);
      if (q.hold !== '1') { for (const k of keys) { await page.keyboard.up(k); held.delete(k); } }
      const r = await status(); if (q.shot) r.shot = await shot(q.shot); r.held = [...held]; return r;
    }
    case '/release': { for (const k of held) await page.keyboard.up(k); held.clear(); return status(); }
    case '/wait': { await advance(q.ms || 250); const r = await status(); if (q.shot) r.shot = await shot(q.shot); return r; }
    case '/tap': {
      const [x, y] = await canvasPoint(+q.x, +q.y);
      await page.mouse.move(x, y); await page.mouse.down(); await advance(q.ms || 100); await page.mouse.up();
      const r = await status(); if (q.shot) r.shot = await shot(q.shot); return r;
    }
    case '/touch': {
      const [x, y] = await canvasPoint(+q.x, +q.y);
      await page.touchscreen.tap(x, y); await advance(q.ms || 50);
      const r = await status(); if (q.shot) r.shot = await shot(q.shot); return r;
    }
    case '/drag': {
      const [x1, y1] = await canvasPoint(+q.x1, +q.y1), [x2, y2] = await canvasPoint(+q.x2, +q.y2);
      const ms = +q.ms || 200, n = Math.max(2, Math.round(ms / 50));
      await page.mouse.move(x1, y1); await page.mouse.down();
      for (let i = 1; i <= n; i++) { await page.mouse.move(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n); await advance(ms / n); }
      await page.mouse.up();
      const r = await status(); if (q.shot) r.shot = await shot(q.shot); return r;
    }
    case '/shot': return { shot: await shot(q.name), ...(await status()) };
    case '/status': return status();
    case '/restart': {
      await page.waitForTimeout(500); await page.keyboard.press('Space'); await advance(100);
      return { restarted: true, ...(await status()) };
    }
    case '/quit': setTimeout(async () => { try { await browser.close(); } catch (e) {} srv.close(); process.exit(0); }, 50); return { bye: true };
    default: return { error: 'unknown endpoint', endpoints: ['/open', '/step', '/release', '/wait', '/tap', '/touch', '/drag', '/shot', '/status', '/restart', '/quit'] };
  }
}

(async () => {
  ({ srv, base } = await serve());
  browser = await launch();
  let busy = Promise.resolve();
  http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    busy = busy.then(async () => {
      let out;
      try { out = await handle(u); } catch (e) { out = { error: String(e && e.message || e) }; }
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out) + '\n');
    });
  }).listen(PORT, '127.0.0.1', () => console.log('play server on http://127.0.0.1:' + PORT + '  shots -> ' + path.relative(process.cwd(), OUT)));
})();
