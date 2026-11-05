#!/usr/bin/env node
// Run the whole lab: check + 50-seed bot runs + screenshots for every game, then aggregate.
// usage: node lab/runall.js [--n 50] [--par 2] [--tag v1] [--only id1,id2] [--skip-shots]
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const N = opt('n', '50'), PAR = +opt('par', 2), TAG = opt('tag', ''), ONLY = opt('only', '');
const GAMES = ['kickback', 'loopback', 'tiltwell', 'spellsnake', 'pipwalk', 'mazewright', 'uptempo', 'compound', 'junkorbit', 'magsumo']
  .filter(g => !ONLY || ONLY.split(',').includes(g))
  .filter(g => fs.existsSync(path.join(__dirname, '..', 'games', g + '.html')));

function sh(args, logFile) {
  return new Promise(res => {
    const p = spawn('node', args, { cwd: path.join(__dirname, '..') });
    const log = fs.createWriteStream(logFile, { flags: 'a' });
    p.stdout.pipe(log); p.stderr.pipe(log);
    p.on('close', code => res(code));
  });
}

(async () => {
  const logDir = path.join(__dirname, 'results', 'logs'); fs.mkdirSync(logDir, { recursive: true });
  const queue = GAMES.slice();
  const t0 = Date.now();
  async function worker() {
    while (queue.length) {
      const id = queue.shift();
      const log = path.join(logDir, id + (TAG ? '.' + TAG : '') + '.log');
      fs.writeFileSync(log, '');
      const c1 = await sh(['lab/check.js', id], log);
      const runArgs = ['lab/run.js', id, '--n', N]; if (TAG) runArgs.push('--tag', TAG);
      const c2 = await sh(runArgs, log);
      let c3 = 0; if (!argv.includes('--skip-shots')) c3 = await sh(['lab/shoot.js', id], log);
      console.log(`${id}: check=${c1 === 0 ? 'PASS' : 'FAIL'} run=${c2} shoot=${c3}  (${Math.round((Date.now() - t0) / 1000)}s)`);
    }
  }
  await Promise.all(Array.from({ length: PAR }, worker));

  // aggregate
  const summary = { date: new Date().toISOString(), tag: TAG, games: {} };
  for (const id of GAMES) {
    const rf = path.join(__dirname, 'results', id + (TAG ? '.' + TAG : '') + '.json');
    const cf = path.join(__dirname, 'results', id + '.check.json');
    if (!fs.existsSync(rf)) continue;
    const r = JSON.parse(fs.readFileSync(rf, 'utf8'));
    const c = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')) : null;
    const per = {};
    for (const [b, d] of Object.entries(r.bots)) per[b] = { medianScore: d.score.median, meanScore: d.score.mean, cv: d.score.cv, medianLenS: d.lengthS.median, maxLenS: d.lengthS.max, medianApm: d.apm.median, capHits: d.capHits, causes: d.causes, medianWallMs: d.wallMs.median, scores: d.sessions.map(s => s.score), lens: d.sessions.map(s => Math.round(s.ms / 100) / 10) };
    summary.games[id] = { check: c ? c.pass : null, checkFails: c ? c.results.filter(x => !x.pass).map(x => x.name + ': ' + x.detail) : [], signals: r.signals, bots: per, errors: r.errors };
  }
  const out = path.join(__dirname, 'results', 'summary' + (TAG ? '.' + TAG : '') + '.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 1));
  console.log('\nGame          check  bot/10  skill×   ladder  smartLen  CV    gap   cap  errs');
  for (const [id, g] of Object.entries(summary.games)) {
    const s = g.signals;
    console.log(`${id.padEnd(13)} ${String(g.check).padEnd(6)} ${String(s.botScore10).padEnd(7)} ${(Math.round(s.skillRatio * 10) / 10 + '').padEnd(8)} ${String(s.ladder).padEnd(7)} ${(Math.round(s.smartMedianLenS) + 's').padEnd(9)} ${(Math.round(s.smartCV * 100) / 100 + '').padEnd(5)} ${(Math.round(s.smartMedianMaxGapS) + 's').padEnd(5)} ${String(!s.notSolved ? 'YES' : 'no').padEnd(4)} ${s.consoleErrors + s.sessionErrors}`);
  }
  console.log('wrote', path.relative(process.cwd(), out));
})();
