#!/usr/bin/env node
// Run N seeded sessions per bot for a game; write lab/results/<id>.json with sessions + summary + fun signals.
// usage: node lab/run.js <id> [--n 50] [--bots random,heuristic,smart] [--cap 900000] [--wall 120000] [--tag name]
'use strict';
const fs = require('fs');
const path = require('path');
const { serve, launch, openGame, loadBots, installLab, stats } = require('./lib');

const argv = process.argv.slice(2);
const id = argv[0];
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const N = +opt('n', 50), CAP = +opt('cap', 900000), WALL = +opt('wall', 120000), TAG = opt('tag', '');
if (!id) { console.error('usage: node lab/run.js <id> [--n 50]'); process.exit(2); }
const SALT = { random: 1, heuristic: 2, smart: 3 };

(async () => {
  const bots = loadBots(id);
  const names = (opt('bots', 'random,heuristic,smart')).split(',').filter(n => bots[n]);
  const { srv, base } = await serve();
  const browser = await launch();
  const out = { id, tag: TAG, n: N, cap: CAP, date: new Date().toISOString(), bots: {}, errors: {} };
  const t0 = Date.now();
  await Promise.all(names.map(async name => {
    const b = bots[name];
    let { ctx, page, errs } = await openGame(browser, base, id);
    await installLab(page);
    const sessions = [];
    for (let seed = 1; seed <= N; seed++) {
      let r;
      try {
        r = await page.evaluate(([src, dm, seed, salt, cap, wall]) => { window.__lab.start(src, dm, seed, salt); return window.__lab.advance(cap, cap, wall); },
          [b.src, b.decisionMs, seed, SALT[name] || 9, CAP, WALL]);
      } catch (e) {
        r = { score: 0, ms: 0, over: false, cause: null, err: 'evaluate failed: ' + String(e).slice(0, 200) };
        // page may be wedged; reopen
        try { await ctx.close(); } catch (_) {}
        ({ ctx, page, errs } = await openGame(browser, base, id)); await installLab(page);
      }
      r.seed = seed; r.capHit = !r.over && r.ms >= CAP;
      sessions.push(r);
      if (seed % 10 === 0 || seed === N) process.stderr.write(`[${id}/${name}] ${seed}/${N} last score=${r.score} len=${(r.ms / 1000).toFixed(1)}s wall=${r.wallMs}ms${r.err ? ' ERR ' + r.err.slice(0, 80) : ''}\n`);
    }
    out.errors[name] = errs.slice();
    const causes = {};
    for (const s of sessions) { const c = s.capHit ? '(survived cap)' : s.err ? '(error)' : (s.cause || '(no cause)'); causes[c] = (causes[c] || 0) + 1; }
    out.bots[name] = {
      decisionMs: b.decisionMs,
      score: stats(sessions.map(s => s.score)),
      lengthS: stats(sessions.map(s => s.ms / 1000)),
      apm: stats(sessions.map(s => s.apm)),
      maxScoreGapS: stats(sessions.map(s => s.maxScoreGapMs / 1000)),
      wallMs: stats(sessions.map(s => s.wallMs)),
      causes, capHits: sessions.filter(s => s.capHit).length, sessionErrors: sessions.filter(s => s.err).length,
      causeReported: sessions.filter(s => s.over && s.cause).length / Math.max(1, sessions.filter(s => s.over).length),
      difficultyRose: sessions.filter(s => s.difficulty0 != null && s.difficulty1 != null && s.difficulty1 > s.difficulty0).length / sessions.length,
      sessions,
    };
    await ctx.close();
  }));
  await browser.close(); srv.close();

  // ---- fun signals ----
  const B = out.bots, R = B.random, Hh = B.heuristic, Sm = B.smart;
  const sig = {};
  if (R && Sm) {
    const pooled = Math.sqrt(((R.score.sd || 0) ** 2 + (Sm.score.sd || 0) ** 2) / 2) || 1;
    sig.skillRatio = Sm.score.median / Math.max(1, R.score.median);
    sig.skillD = (Sm.score.mean - R.score.mean) / pooled;
    sig.skillGap = sig.skillRatio >= 3 || sig.skillD > 2;
  }
  if (R && Hh && Sm) sig.ladder = R.score.median < Hh.score.median && Hh.score.median < Sm.score.median;
  if (Sm) {
    sig.smartMedianLenS = Sm.lengthS.median;
    sig.pacing = Sm.lengthS.median >= 60 && Sm.lengthS.median <= 300;
    sig.variety = Sm.score.cv >= 0.15; sig.smartCV = Sm.score.cv;
    sig.rewardCadence = Sm.maxScoreGapS.median <= 30; sig.smartMedianMaxGapS = Sm.maxScoreGapS.median;
    sig.difficultyRises = Sm.difficultyRose >= 0.9;
  }
  sig.notSolved = Object.values(B).every(b => b.capHits === 0);
  sig.causeLegible = Object.values(B).every(b => b.causeReported >= 0.9);
  sig.consoleErrors = Object.values(out.errors).reduce((s, e) => s + e.length, 0);
  sig.sessionErrors = Object.values(B).reduce((s, b) => s + b.sessionErrors, 0);
  sig.bugFree = sig.consoleErrors === 0 && sig.sessionErrors === 0;
  // bot score out of 10 over principles 5,7,8,9,10,13,14 (+ bug gate)
  const pts = [
    sig.causeLegible ? 2 : 0,
    sig.skillGap ? 2 : (sig.skillRatio >= 1.7 ? 1 : 0),
    sig.ladder ? 2 : (Hh && Sm && R && Sm.score.median > R.score.median ? 1 : 0),
    (sig.pacing ? 1 : (Sm && Sm.lengthS.median >= 30 && Sm.lengthS.median <= 480 ? 0.5 : 0)) + (sig.difficultyRises ? 1 : 0),
    sig.notSolved ? 2 : 0,
    sig.variety ? 2 : (Sm && Sm.score.cv >= 0.07 ? 1 : 0),
    sig.rewardCadence ? 2 : (Sm && Sm.maxScoreGapS.median <= 60 ? 1 : 0),
  ];
  sig.botPoints = pts.reduce((a, b) => a + b, 0);
  sig.botScore10 = Math.round((sig.botPoints / 14) * 100) / 10;
  if (!sig.bugFree) sig.botScore10 = Math.min(sig.botScore10, 3);
  out.signals = sig;
  out.wallS = Math.round((Date.now() - t0) / 1000);

  const dir = path.join(__dirname, 'results'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, id + (TAG ? '.' + TAG : '') + '.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  // console summary
  const f = x => x == null ? '-' : (Math.round(x * 10) / 10);
  console.log(`\n== ${id} (${N} seeds/bot, ${out.wallS}s wall) ==`);
  for (const [n, b] of Object.entries(B)) {
    console.log(`${n.padEnd(10)} score med ${f(b.score.median)} [p10 ${f(b.score.p10)} p90 ${f(b.score.p90)}] cv ${f(b.score.cv)} | len med ${f(b.lengthS.median)}s max ${f(b.lengthS.max)}s | apm ${f(b.apm.median)} | capHits ${b.capHits} | wall med ${f(b.wallMs.median)}ms`);
    console.log(`           causes: ${JSON.stringify(b.causes)}`);
  }
  console.log('signals:', JSON.stringify(sig));
  console.log('errors:', JSON.stringify(out.errors).slice(0, 500));
  console.log('wrote', path.relative(process.cwd(), file));
})();
