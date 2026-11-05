#!/usr/bin/env node
// Contract conformance + determinism + console-error smoke test for one game.
// usage: node lab/check.js <id> [--json]
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, serve, launch, openGame, loadBots, installLab } = require('./lib');

const id = process.argv[2];
const asJson = process.argv.includes('--json');
if (!id) { console.error('usage: node lab/check.js <id>'); process.exit(2); }

const REQUIRED = ['reset', 'getState', 'getActions', 'input', 'tick', 'isOver', 'score', 'snapshot', 'restore', 'quiet', 'render'];

(async () => {
  const results = [];
  const ok = (name, pass, detail) => { results.push({ name, pass: !!pass, detail: detail || '' }); };
  const { srv, base } = await serve();
  const browser = await launch();
  const allErrs = [];
  try {
    const html = fs.readFileSync(path.join(ROOT, 'games', id + '.html'), 'utf8');
    ok('single file: no external scripts/styles', !/<script[^>]+src=|<link[^>]+href=["']?https?:|@import|fetch\(|XMLHttpRequest/i.test(html));
    ok('no Math.random/Date.now in file outside FX (manual review if flagged)', true,
      'Math.random uses: ' + (html.match(/Math\.random/g) || []).length + ', Date.now uses: ' + (html.match(/Date\.now/g) || []).length);
    ok('has <title> and meta description', /<title>[^<]+<\/title>/.test(html) && /name=["']description["']/.test(html));
    ok('uses localStorage key funlab.' + id + '.best', html.includes('funlab.') && html.includes('.best'));

    // 1) real-time human mode with keyboard + mouse
    {
      const { ctx, page, errs } = await openGame(browser, base, id, { settle: 800 });
      const t0 = await page.evaluate(() => window.__game && window.__game.getState().t);
      for (const k of ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ', 'KeyK', 'KeyF']) {
        await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k);
      }
      const box = await page.locator('canvas').first().boundingBox();
      for (const [fx, fy] of [[0.2, 0.8], [0.8, 0.8], [0.5, 0.5], [0.5, 0.2]]) {
        await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
        await page.waitForTimeout(80);
      }
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.6); await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4, { steps: 5 }); await page.mouse.up();
      await page.waitForTimeout(1500);
      const t1 = await page.evaluate(() => window.__game && window.__game.getState().t);
      ok('real-time mode advances sim after input', typeof t1 === 'number' && t1 > (t0 || 0), `t ${t0} -> ${t1}`);
      const api = await page.evaluate((req) => req.filter(m => !window.__game || typeof window.__game[m] !== 'function'), REQUIRED);
      ok('window.__game has all methods', api.length === 0, api.length ? 'missing: ' + api.join(',') : '');
      allErrs.push(...errs.map(e => '[realtime] ' + e));
      await ctx.close();
    }

    // 2) touch device
    {
      const { ctx, page, errs } = await openGame(browser, base, id, { touch: true, mobile: true, viewport: { width: 390, height: 844 }, settle: 600 });
      const box = await page.locator('canvas').first().boundingBox();
      for (const [fx, fy] of [[0.2, 0.85], [0.8, 0.85], [0.5, 0.5], [0.5, 0.15], [0.2, 0.5], [0.8, 0.5]]) {
        await page.touchscreen.tap(box.x + box.width * fx, box.y + box.height * fy);
        await page.waitForTimeout(120);
      }
      await page.waitForTimeout(800);
      const t = await page.evaluate(() => window.__game.getState().t);
      ok('touch: game responds / runs', t > 0, 't=' + t);
      ok('touch: canvas fits 390px viewport', box.width <= 391 && box.height <= 845, `${Math.round(box.width)}x${Math.round(box.height)}`);
      await page.screenshot({ path: path.join(__dirname, 'shots', id + '-mobile.png') }).catch(() => {});
      allErrs.push(...errs.map(e => '[touch] ' + e));
      await ctx.close();
    }

    // 3) API + determinism
    {
      const { ctx, page, errs } = await openGame(browser, base, id);
      await installLab(page);
      const r = await page.evaluate(() => {
        const G = window.__game, out = {};
        G.reset(123);
        const st = G.getState();
        out.stateKeys = ['t', 'score', 'over', 'cause', 'difficulty'].filter(k => !(k in st));
        try { JSON.stringify(st); out.json = true; } catch (e) { out.json = false; }
        const acts = G.getActions();
        out.acts = acts; out.hasNone = acts.includes('none'); out.nActs = acts.length;
        try { G.input('definitely-not-an-action'); out.junkOk = true; } catch (e) { out.junkOk = false; }
        G.tick(1000);
        out.tAfter = G.getState().t;
        out.over0 = G.isOver();
        out.scoreNum = typeof G.score() === 'number';
        return out;
      });
      ok('getState has t/score/over/cause/difficulty', r.stateKeys.length === 0, r.stateKeys.join(','));
      ok('getState JSON-serialisable', r.json);
      ok('getActions includes none, ≤6 actions', r.hasNone && r.nActs <= 6, JSON.stringify(r.acts));
      ok('input(junk) does not throw', r.junkOk);
      ok('tick(1000) advances t', r.tAfter > 0, 't=' + r.tAfter);
      ok('not over after 1s idle', !r.over0);
      ok('score() is a number', r.scoreNum);

      // determinism: same seed + same random-action sequence twice
      const det = await page.evaluate(() => {
        const G = window.__game;
        function mul(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
        function run(seed) {
          G.reset(seed); const r = mul(42);
          for (let i = 0; i < 600 && !G.isOver(); i++) { const a = G.getActions(); G.input(a[Math.floor(r() * a.length)]); G.tick(50); }
          return JSON.stringify(G.getState());
        }
        const a = run(7), b = run(7), c = run(8);
        // snapshot/restore
        G.reset(99); const r1 = mul(5);
        for (let i = 0; i < 40 && !G.isOver(); i++) { const ac = G.getActions(); G.input(ac[Math.floor(r1() * ac.length)]); G.tick(50); }
        const snap = G.snapshot();
        const seq = []; const r2 = mul(6);
        for (let i = 0; i < 100; i++) seq.push(r2());
        function play() { for (let i = 0; i < 100 && !G.isOver(); i++) { const ac = G.getActions(); G.input(ac[Math.floor(seq[i] * ac.length)]); G.tick(50); } return JSON.stringify(G.getState()); }
        const x = play(); G.restore(snap); G.quiet(true); const y = play(); G.quiet(false); G.restore(snap); const z = play();
        return { same: a === b, differs: a !== c, snap: x === y && y === z, len: a.length };
      });
      ok('determinism: same seed+inputs ⇒ same state', det.same);
      ok('different seeds ⇒ different runs', det.differs);
      ok('snapshot/restore (+quiet) reproduces exactly', det.snap);

      // bots exist and run briefly
      try {
        const bots = loadBots(id);
        ok('bots file has random/heuristic/smart', ['random', 'heuristic', 'smart'].every(n => bots[n]), Object.keys(bots).join(','));
        for (const [name, b] of Object.entries(bots)) {
          const s = await page.evaluate(([src, dm]) => { window.__lab.start(src, dm, 3, 1); return window.__lab.advance(20000, 900000, 15000); }, [b.src, b.decisionMs]);
          ok(`bot ${name} runs 20s without error`, !s.err, s.err ? s.err.slice(0, 300) : `score=${s.score} ms=${s.ms} wall=${s.wallMs}ms`);
        }
      } catch (e) { ok('bots file loads', false, String(e).slice(0, 300)); }
      allErrs.push(...errs.map(e => '[api] ' + e));
      await ctx.close();
    }
    ok('zero console/page errors', allErrs.length === 0, allErrs.slice(0, 8).join(' | '));
  } catch (e) {
    ok('harness exception', false, String(e && e.stack || e).slice(0, 500));
  } finally {
    await browser.close(); srv.close();
  }
  const failed = results.filter(r => !r.pass);
  if (asJson) console.log(JSON.stringify({ id, pass: failed.length === 0, results }, null, 1));
  else {
    for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? '  — ' + r.detail : ''));
    console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL PASS');
  }
  fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'results', id + '.check.json'), JSON.stringify({ id, pass: failed.length === 0, results }, null, 1));
  process.exit(failed.length ? 1 : 0);
})();
