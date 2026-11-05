#!/usr/bin/env node
// Extra bot tiers that the original lab lacked (see REPORT "What I'd build next"):
//   MASHER family : no state reading at all. One strategy per action name ("hold/mash X forever",
//                   falling back to the first available button when X isn't offered), plus "cycle all".
//                   The best masher is the spam-exploit detector.
//   HUMAN model   : wraps the game's own smart bot with human limits, per game class:
//                   realtime -> perception latency (decides on a 100 ms-old snapshot: anticipatory tracking), 100 ms decision rate, 3% slips
//                   (a first calibration at 160 ms / 120 ms quantised to ~240 ms of staleness and scored BELOW the masher in
//                    LOOPBACK, contradicting both critics' deliberate play -> rejected as miscalibrated; see DECISIONS D13)
//                   rhythm   -> no latency (players anticipate) but 0-33 ms execution jitter, 3% wrong-lane slips
//                   turn     -> no latency, >= 400 ms "thinking" per move, 3% slips
// usage: node lab/tiers.js <id|all> [--n 50] [--nm 30]
'use strict';
const fs = require('fs');
const path = require('path');
const { serve, launch, openGame, loadBots, installLab, stats } = require('./lib');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const N = +opt('n', 50), NM = +opt('nm', 30), CAP = 900000, WALL = 150000;
const ALL = ['kickback', 'loopback', 'tiltwell', 'spellsnake', 'pipwalk', 'mazewright', 'uptempo', 'compound', 'junkorbit', 'magsumo', 'emberdeep'];
const ids = (argv[0] === 'all' || !argv[0]) ? ALL.filter(g => fs.existsSync(path.join(__dirname, '..', 'games', g + '.html'))) : argv[0].split(',');
const CLASS = { kickback: 'realtime', loopback: 'realtime', junkorbit: 'realtime', magsumo: 'realtime', spellsnake: 'realtime', tiltwell: 'realtime',
  uptempo: 'rhythm', pipwalk: 'turn', mazewright: 'turn', compound: 'turn', emberdeep: 'turn' };
const HUMAN = { realtime: { lat: 100, interval: 100, jitter: 0, slip: 0.03 }, rhythm: { lat: 0, interval: 1000 / 60, jitter: 2, slip: 0.03 }, turn: { lat: 0, interval: 400, jitter: 0, slip: 0.03 } };

function masherSrc(name) {
  // name === '*cycle' -> cycle through whatever is offered
  return `function (G, rng, mem) {
    const acts = G.getActions().filter(a => a !== 'none');
    if (!acts.length) return 'none';
    const want = ${JSON.stringify(name)};
    if (want === '*cycle') { mem.k = ((mem.k || 0) + 1); return acts[mem.k % acts.length]; }
    return acts.includes(want) ? want : acts[0];
  }`;
}

function humanSrc(innerSrc, p) {
  return `function (G, rng, mem) {
    if (!mem.init) {
      mem.init = true; mem.inner = (0, eval)('(' + ${JSON.stringify(innerSrc)} + ')'); mem.im = {}; mem.hist = []; mem.q = []; mem.clock = 0;
    }
    const P = ${JSON.stringify(p)};
    const now = (mem.clock += P.interval);
    let a;
    if (P.lat > 0) {
      const cur = G.snapshot();
      mem.hist.push({ t: now, s: cur });
      while (mem.hist.length > 2 && mem.hist[1].t <= now - P.lat) mem.hist.shift();
      const old = mem.hist[0];
      if (old.t <= now - P.lat && old.s !== cur) { G.restore(old.s); a = mem.inner(G, rng, mem.im); G.restore(cur); }
      else a = mem.inner(G, rng, mem.im);
    } else a = mem.inner(G, rng, mem.im);
    if (a != null && a !== 'none' && rng() < P.slip) { const acts = G.getActions(); a = acts[Math.floor(rng() * acts.length)]; }
    if (P.jitter > 0) {
      if (a != null && a !== 'none') mem.q.push({ t: now + Math.floor(rng() * (P.jitter + 1)) * P.interval, a });
      const due = mem.q.findIndex(x => x.t <= now);
      if (due >= 0) return mem.q.splice(due, 1)[0].a;
      return 'none';
    }
    return a;
  }`;
}

async function runSessions(browser, base, id, src, dm, n, salt, label) {
  let { ctx, page, errs } = await openGame(browser, base, id);
  await installLab(page);
  const out = [];
  for (let seed = 1; seed <= n; seed++) {
    let r;
    try { r = await page.evaluate(([src, dm, seed, salt, cap, wall]) => { window.__lab.start(src, dm, seed, salt); return window.__lab.advance(cap, cap, wall); }, [src, dm, seed, salt, CAP, WALL]); }
    catch (e) { r = { score: 0, ms: 0, over: false, err: 'evaluate failed: ' + String(e).slice(0, 160) }; try { await ctx.close(); } catch (_) {} ({ ctx, page, errs } = await openGame(browser, base, id)); await installLab(page); }
    r.seed = seed; r.capHit = !r.over && r.ms >= CAP; out.push(r);
  }
  process.stderr.write(`[${id}/${label}] done: median ${stats(out.map(s => s.score)).median}\n`);
  await ctx.close();
  return { sessions: out, errors: errs.slice() };
}

async function vocabulary(browser, base, id) {
  const { ctx, page } = await openGame(browser, base, id);
  const v = await page.evaluate(() => {
    const G = window.__game, seen = new Set();
    for (let s = 1; s <= 4; s++) {
      G.reset(s); let r = s * 7;
      for (let i = 0; i < 1500 && !G.isOver(); i++) { const a = G.getActions(); a.forEach(x => seen.add(x)); r = (r * 1103515245 + 12345) & 0x7fffffff; G.input(a[r % a.length]); G.tick(100); }
    }
    seen.delete('none'); return [...seen];
  });
  await ctx.close();
  return v;
}

(async () => {
  const { srv, base } = await serve();
  const browser = await launch();
  for (const id of ids) {
    const t0 = Date.now();
    const bots = loadBots(id);
    const vocab = await vocabulary(browser, base, id);
    const p = HUMAN[CLASS[id] || 'realtime'];
    const humanDm = Math.max(p.interval, CLASS[id] === 'rhythm' ? bots.smart.decisionMs : 0);
    const jobs = [...vocab.map(a => ['mash:' + a, masherSrc(a), 100, NM, 40]), ['mash:*cycle', masherSrc('*cycle'), 100, NM, 41], ['human', humanSrc(bots.smart.src, { ...p, interval: humanDm }), humanDm, N, 50], ['human-h', humanSrc(bots.heuristic.src, { ...p, interval: Math.max(humanDm, CLASS[id] === 'rhythm' ? bots.heuristic.decisionMs : 0) }), Math.max(humanDm, CLASS[id] === 'rhythm' ? bots.heuristic.decisionMs : 0), N, 51]];
    const res = {};
    await Promise.all(jobs.map(async ([label, src, dm, n, salt]) => { res[label] = await runSessions(browser, base, id, src, dm, n, salt, label); }));
    const summ = {};
    for (const [label, r] of Object.entries(res)) {
      const s = r.sessions;
      const causes = {}; for (const x of s) { const c = x.capHit ? '(survived cap)' : x.err ? '(error)' : (x.cause || '(no cause)'); causes[c] = (causes[c] || 0) + 1; }
      summ[label] = { score: stats(s.map(x => x.score)), lengthS: stats(s.map(x => x.ms / 1000)), capHits: s.filter(x => x.capHit).length, errors: r.errors.length + s.filter(x => x.err).length, causes, scores: s.map(x => x.score), lens: s.map(x => Math.round(x.ms / 100) / 10) };
    }
    const mashers = Object.entries(summ).filter(([k]) => k.startsWith('mash:')).sort((a, b) => b[1].score.median - a[1].score.median);
    // a real player adapts strategy to their own limits: the human estimate is the better of the two human-limited bots
    const bestHuman = summ['human-h'] && summ['human-h'].score.median > summ.human.score.median ? 'human-h' : 'human';
    const out = { id, class: CLASS[id], human: { ...p, interval: humanDm }, vocab, date: new Date().toISOString(), bestMasher: mashers[0][0], bestHuman, tiers: summ, wallS: Math.round((Date.now() - t0) / 1000) };
    fs.writeFileSync(path.join(__dirname, 'results', id + '.tiers.json'), JSON.stringify(out, null, 1));
    const f = x => Math.round(x * 10) / 10;
    console.log(`${id.padEnd(11)} best masher ${mashers[0][0].padEnd(18)} med ${f(mashers[0][1].score.median)} (${f(mashers[0][1].lengthS.median)}s) | human(smart) ${f(summ.human.score.median)} (${f(summ.human.lengthS.median)}s) | human(heur) ${f(summ['human-h'].score.median)} (${f(summ['human-h'].lengthS.median)}s) | best=${bestHuman} | caps ${summ.human.capHits + summ['human-h'].capHits} | ${out.wallS}s`);
  }
  await browser.close(); srv.close();
})();
