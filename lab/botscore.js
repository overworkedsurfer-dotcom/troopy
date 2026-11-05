#!/usr/bin/env node
// Graded bot score (v2). The v1 threshold signals in run.js saturated: every builder tuned to the published
// thresholds, so every game scored 10/10 (Goodhart). v2 scores the SAME FUN.md principles on continuous scales.
// usage: node lab/botscore.js [summary-file]   -> prints table, writes lab/results/botscore(.tag).json
'use strict';
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, 'results', 'summary.v1.json');
const S = JSON.parse(fs.readFileSync(file, 'utf8'));
const clamp = x => Math.max(0, Math.min(1, x));
const lin = (x, x0, x1) => clamp((x - x0) / (x1 - x0));          // 0 at x0, 1 at x1
const band = (x, lo0, lo1, hi1, hi0) => x < lo1 ? lin(x, lo0, lo1) : x > hi1 ? 1 - lin(x, hi1, hi0) : 1;

// weights per component (principle in brackets)
const W = { legible: 1, skill: 1, slope: 1, pacing: 1, solved: 1, variety: 1, cadence: 1, flail: 0.5 };
const out = {};
for (const [id, g] of Object.entries(S.games)) {
  const r = g.bots.random, h = g.bots.heuristic, s = g.bots.smart, sig = g.signals;
  const R = Math.max(1, r.medianScore), Hh = Math.max(1, h.medianScore), Sm = Math.max(1, s.medianScore);
  const c = {};
  c.legible = sig.causeLegible ? 1 : 0;                                    // P5
  c.skill = lin(Math.log10(Sm / R), 0, 1.5);                               // P7: full credit at >= ~30x random
  const p = Math.log(Sm / R) > 0 ? Math.log(Hh / R) / Math.log(Sm / R) : 0; // P8: where heuristic sits on the log ladder
  c.slope = 1 - clamp((Math.abs(p - 0.5) - 0.2) / 0.3);                    //     0.3..0.7 = smooth slope
  c.pacing = band(s.medianLenS, 30, 90, 240, 480);                         // P9
  c.solved = sig.notSolved ? 1 : 0;                                        // P10
  c.variety = lin(s.cv, 0, 0.4);                                           // P13
  c.cadence = 1 - lin(sig.smartMedianMaxGapS, 10, 40);                     // P14
  const fr = r.medianLenS / Math.max(1, s.medianLenS);                     // P4/P7 proxy: flailing survival ratio
  c.flail = band(fr, 0.01, 0.1, 0.35, 0.8);                                //     instant death = harsh; immortal flailing = no agency
  let num = 0, den = 0; for (const [k, w] of Object.entries(W)) { num += w * c[k]; den += w; }
  out[id] = { score10: Math.round(100 * num / den) / 10, components: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v * 100) / 100])), heuristicLadderPos: Math.round(p * 100) / 100, flailRatio: Math.round(fr * 1000) / 1000, bugFree: sig.bugFree };
  if (!sig.bugFree) out[id].score10 = Math.min(out[id].score10, 3);
}
const tag = path.basename(file).replace(/^summary\.?|\.json$/g, '');
fs.writeFileSync(path.join(__dirname, 'results', 'botscore' + (tag ? '.' + tag : '') + '.json'), JSON.stringify(out, null, 1));
console.log('game         bot2/10  legible skill slope pacing solved variety cadence flail | ladderPos flailRatio');
for (const [id, o] of Object.entries(out).sort((a, b) => b[1].score10 - a[1].score10)) {
  const c = o.components;
  console.log(`${id.padEnd(12)} ${String(o.score10).padEnd(8)} ${[c.legible, c.skill, c.slope, c.pacing, c.solved, c.variety, c.cadence, c.flail].map(v => String(v).padEnd(6)).join(' ')}| ${o.heuristicLadderPos}  ${o.flailRatio}`);
}
