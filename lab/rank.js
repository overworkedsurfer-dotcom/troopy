#!/usr/bin/env node
// Combine bot (graded v2), blind critic, and my own scores into the final ranking -> lab/scores.json
// usage: node lab/rank.js [--tag v2]
//   needs: lab/results/botscore.<tag>.json, lab/notes/critic-scores.json, lab/notes/mine-scores.json, lab/games.json
'use strict';
const fs = require('fs');
const path = require('path');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const TAG = opt('tag', 'v1');
const rd = f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
const meta = rd('games.json');
const bot = rd('results/botscore.' + TAG + '.json');
const critic = rd('notes/critic-scores.json');
const mine = rd('notes/mine-scores.json');
const W = { bot: 0.30, critic: 0.35, mine: 0.35 };

const rows = Object.keys(meta).map(id => {
  const b = bot[id] ? bot[id].score10 : null;
  const c = critic[id] ? critic[id].score : null;
  const m = mine[id] ? (mine[id].gut2 ?? mine[id].gut) : null;
  const final = Math.round((W.bot * b + W.critic * c + W.mine * m) * 100) / 100;
  return { id, ...meta[id], bot: b, critic: c, mine: m, final, bugFree: bot[id] ? bot[id].bugFree : false, criticRound: critic[id] ? critic[id].round : null };
});
// disqualify buggy games from winning; rank by final, tie-break by bot skill component
rows.sort((a, b) => (b.bugFree - a.bugFree) || (b.final - a.final) || ((bot[b.id]?.components.skill || 0) - (bot[a.id]?.components.skill || 0)));
rows.forEach((r, i) => { r.rank = i + 1; });
const prev = fs.existsSync(path.join(__dirname, 'scores.json')) ? rd('scores.json') : {};
const shots = prev.shots || {};
for (const r of rows) r.shot = shots[r.id] || '2-mid';
const out = { tag: TAG, weights: W, winner: { id: rows[0].id, why: (prev.winner && prev.winner.id === rows[0].id && prev.winner.why) || '' }, shots, games: rows };
fs.writeFileSync(path.join(__dirname, 'scores.json'), JSON.stringify(out, null, 1));
console.log('rank game         bot   critic mine  final');
for (const r of rows) console.log(String(r.rank).padEnd(4), r.name.padEnd(12), String(r.bot).padEnd(5), String(r.critic).padEnd(6), String(r.mine).padEnd(5), r.final);
