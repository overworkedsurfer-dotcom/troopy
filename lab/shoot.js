#!/usr/bin/env node
// Screenshot start / mid / intense / game-over for a game, using a bot on a fixed seed.
// usage: node lab/shoot.js <id> [--bot smart] [--seed 1] [--out lab/shots/<id>] [--scale 1]
'use strict';
const fs = require('fs');
const path = require('path');
const { serve, launch, openGame, loadBots, installLab } = require('./lib');

const argv = process.argv.slice(2);
const id = argv[0];
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const BOT = opt('bot', 'smart'), SEED = +opt('seed', 1), OUT = opt('out', path.join(__dirname, 'shots', id)), SCALE = +opt('scale', 1);
const CAP = 900000;

(async () => {
  const bots = loadBots(id);
  const b = bots[BOT];
  const { srv, base } = await serve();
  const browser = await launch();
  const { ctx, page, errs } = await openGame(browser, base, id, { dpr: SCALE, viewport: { width: 900, height: 760 } });
  fs.mkdirSync(OUT, { recursive: true });
  // first, the very first frame a human sees (real-time, before any API call)
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, '0-firstlook.png') });
  await installLab(page);
  // pass 1: measure session length
  const full = await page.evaluate(([src, dm, seed, cap]) => { window.__lab.start(src, dm, seed, 3); return window.__lab.advance(cap, cap, 300000); }, [b.src, b.decisionMs, SEED, CAP]);
  const L = full.ms;
  const marks = [
    ['1-start', Math.min(1500, L * 0.05)],
    ['2-mid', L * 0.5],
    ['3-intense', Math.max(L * 0.55, L - 1500)],
    ['4-gameover', L + 1],
  ];
  // pass 2: deterministic replay, pausing at marks
  await page.evaluate(([src, dm, seed]) => window.__lab.start(src, dm, seed, 3), [b.src, b.decisionMs, SEED]);
  const shots = [];
  for (const [name, t] of marks) {
    const s = await page.evaluate(([t, cap]) => window.__lab.advance(t, cap, 300000), [t, CAP]);
    if (name === '4-gameover') await page.evaluate(() => window.__game.tick(700));
    await page.evaluate(() => window.__game.render());
    await page.waitForTimeout(50);
    const file = path.join(OUT, name + '.png');
    await page.locator('canvas').first().screenshot({ path: file });
    shots.push({ name, t: Math.round(s.ms), score: s.score, over: s.over, file: path.relative(process.cwd(), file) });
  }
  const meta = { id, bot: BOT, seed: SEED, lengthMs: L, finalScore: full.score, cause: full.cause, replayMatches: shots[3].score === full.score, shots, errors: errs };
  fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(meta, null, 1));
  console.log(JSON.stringify(meta, null, 1));
  await browser.close(); srv.close();
})();
