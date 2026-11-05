#!/usr/bin/env node
// Emit the markdown tables for REPORT.md from lab data (so the report's numbers are generated, not typed).
// usage: node lab/reporttables.js > lab/results/report-tables.md
'use strict';
const fs = require('fs');
const path = require('path');
const rd = f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
const sc = rd('scores.json');
const v1 = rd('results/summary.v1.json'), v2 = rd('results/summary.v2.json');
const b1 = rd('results/botscore.v1.json'), b2 = rd('results/botscore.v2.json');
const f1 = x => (x == null || isNaN(x)) ? '–' : (Math.round(x * 10) / 10).toFixed(1);
const k = x => x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e4 ? Math.round(x / 1e3) + 'k' : x >= 1e3 ? (x / 1e3).toFixed(1) + 'k' : String(Math.round(x));
const ratio = x => x >= 1000 ? k(x) + '×' : (x >= 100 ? Math.round(x) : x.toFixed(1)) + '×';
let o = '';

o += '### Final ranking\n\n';
o += '| Rank | Game | Genre | Bot /10 | Blind critic | Me | **Final** | Round-1 final (rank) |\n|---:|---|---|---:|---:|---:|---:|---:|\n';
for (const g of sc.games) o += `| ${g.rank} | **${g.name}** | ${g.genre} | ${f1(g.bot)} | ${g.critic}${g.criticRound === 2 ? ' ²' : ''} | ${f1(g.mine)} | **${f1(g.final)}** | ${f1(g.final1)} (#${g.rank1}) |\n`;
o += '\n² = score from the fresh round-2 blind critic, given after the Phase 4 changes. The others are from round 1. Final = 0.30 × bot + 0.35 × critic + 0.35 × me.\n\n';

o += '### Bot metrics (round 2, 50 seeded sessions per bot)\n\n';
o += '| Game | Random median | Heuristic median | Smart median | Skill gap (smart ÷ random) | Smart median length | Smart max length | Smart CV | Longest scoreless gap (median) | Cap hits | Errors |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
for (const g of sc.games) {
  const s = v2.games[g.id], B = s.bots, sig = s.signals;
  o += `| ${g.name} | ${k(B.random.medianScore)} | ${k(B.heuristic.medianScore)} | ${k(B.smart.medianScore)} | ${ratio(sig.skillRatio)} | ${Math.round(B.smart.medianLenS)} s | ${Math.round(B.smart.maxLenS)} s | ${f1(B.smart.cv)} | ${f1(sig.smartMedianMaxGapS)} s | ${B.random.capHits + B.heuristic.capHits + B.smart.capHits} | ${sig.consoleErrors + sig.sessionErrors} |\n`;
}
o += '\n### Round 1 → round 2 (bot side)\n\n';
o += '| Game | Skill gap r1 → r2 | Random-bot survival r1 → r2 | Smart median length r1 → r2 | Graded bot score r1 → r2 |\n|---|---:|---:|---:|---:|\n';
for (const g of sc.games) {
  const a = v1.games[g.id], b = v2.games[g.id];
  o += `| ${g.name} | ${ratio(a.signals.skillRatio)} → ${ratio(b.signals.skillRatio)} | ${f1(a.bots.random.medianLenS)} s → ${f1(b.bots.random.medianLenS)} s | ${Math.round(a.bots.smart.medianLenS)} s → ${Math.round(b.bots.smart.medianLenS)} s | ${f1(b1[g.id].score10)} → ${f1(b2[g.id].score10)} |\n`;
}
const tot = v => Object.values(v.games).reduce((s, g) => s + Object.values(g.bots).reduce((t, b) => t + b.scores.length, 0), 0);
const errs = v => Object.values(v.games).reduce((s, g) => s + g.signals.consoleErrors + g.signals.sessionErrors, 0);
o += `\nSessions: ${tot(v1)} in round 1 and ${tot(v2)} in round 2. Console or session errors: ${errs(v1)} and ${errs(v2)}. No bot in any session survived the 15-minute cap.\n`;
process.stdout.write(o);

// weight sensitivity
const schemes = [['Official (0.30 bot, 0.35 critic, 0.35 me)', [.3, .35, .35]], ['Equal thirds', [1 / 3, 1 / 3, 1 / 3]], ['Bots only', [1, 0, 0]], ['Blind critic only', [0, 1, 0]], ['My score only', [0, 0, 1]], ['Humans only (critic + me)', [0, .5, .5]]];
let s2 = '\n### Does the winner survive other weightings?\n\n| Weighting | 1st | 2nd | 3rd |\n|---|---|---|---|\n';
for (const [n, [b, c, m]] of schemes) {
  const r = sc.games.map(g => ({ n: g.name, v: b * g.bot + c * g.critic + m * g.mine })).sort((x, y) => y.v - x.v);
  s2 += `| ${n} | ${r[0].n} (${r[0].v.toFixed(2)}) | ${r[1].n} (${r[1].v.toFixed(2)}) | ${r[2].n} (${r[2].v.toFixed(2)}) |\n`;
}
process.stdout.write(s2);
