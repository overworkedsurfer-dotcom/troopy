#!/usr/bin/env node
// Combine bot (graded v2 metric), blind critic, and my own scores into the final ranking -> lab/scores.json
// Also computes the round-1 final (v1 bot data, round-1 critic, round-1 gut) for before/after.
// usage: node lab/rank.js [--tag v2]
'use strict';
const fs = require('fs');
const path = require('path');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const TAG = opt('tag', 'v2');
const rd = f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
const meta = rd('games.json');
const bot = rd('results/botscore.' + TAG + '.json');
const bot1 = fs.existsSync(path.join(__dirname, 'results/botscore.v1.json')) ? rd('results/botscore.v1.json') : bot;
const critic = rd('notes/critic-scores.json');
const mine = rd('notes/mine-scores.json');
const W = { bot: 0.30, critic: 0.35, mine: 0.35 };
const r2 = x => Math.round(x * 100) / 100;

const rows = Object.keys(meta).map(id => {
  const b = bot[id].score10, c = critic[id].score, m = mine[id].gut2 ?? mine[id].gut;
  const final = r2(W.bot * b + W.critic * c + W.mine * m);
  const b1 = bot1[id].score10, c1 = critic[id].r1, m1 = mine[id].gut;
  const final1 = r2(W.bot * b1 + W.critic * c1 + W.mine * m1);
  const rubric = mine[id].rubric.reduce((a, x) => a + x, 0);
  return { id, ...meta[id], bot: b, critic: c, criticRound: critic[id].round, criticR1: c1, mine: m, mineR1: m1, myRubric30: rubric,
    final, bot1: b1, final1, bugFree: bot[id].bugFree, skill: bot[id].components.skill };
});
rows.sort((a, b) => (b.bugFree - a.bugFree) || (b.final - a.final) || (b.skill - a.skill));
rows.forEach((r, i) => { r.rank = i + 1; });
const r1sorted = rows.slice().sort((a, b) => b.final1 - a.final1);
r1sorted.forEach((r, i) => { r.rank1 = i + 1; });
const prev = fs.existsSync(path.join(__dirname, 'scores.json')) ? rd('scores.json') : {};
const shots = prev.shots || {};
for (const r of rows) r.shot = shots[r.id] || '2-mid';
const out = { tag: TAG, weights: W, winner: { id: rows[0].id, why: (prev.winner && prev.winner.id === rows[0].id && prev.winner.why) || '' }, shots, games: rows, bonus: prev.bonus || [], links: prev.links || {} };
fs.writeFileSync(path.join(__dirname, 'scores.json'), JSON.stringify(out, null, 1));
console.log('rank game         bot   critic(rd) mine  final | r1: rank final');
for (const r of rows) console.log(String(r.rank).padEnd(4), r.name.padEnd(12), String(r.bot).padEnd(5), (r.critic + '(' + r.criticRound + ')').padEnd(10), String(r.mine).padEnd(5), String(r.final).padEnd(5), '|', r.rank1, r.final1);
