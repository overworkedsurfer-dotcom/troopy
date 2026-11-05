// Per-game "human" input patterns for the audio lab. Real-time mode only (never __game.reset): the runner sends real
// key presses through Playwright's keyboard (CDP, trusted events) and reads __game.getState() only to keep the pattern
// sensible (steer toward a pickup, answer a card pick, restart after game over).
//
// A policy: { unlock, every, read(), step(st, ms, mem) -> ops }. read is stringified and evaluated in the page; it returns
// a small JSON object. ops are ['press', code] | ['down', code] | ['up', code].
// step's 4th argument is { careless }: true in the second half of a session that has not seen a game over yet. A player
// that gets sloppy then lets the game end on its own terms, so its game-over sound is captured too.
'use strict';

const DIRKEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

// hold exactly the keys in `want` (array of codes); release the others that this policy holds
function holdOnly(mem, want) {
  const ops = [], held = mem.held || (mem.held = {});
  for (const k of Object.keys(held)) if (held[k] && !want.includes(k)) { ops.push(['up', k]); held[k] = false; }
  for (const k of want) if (!held[k]) { ops.push(['down', k]); held[k] = true; }
  return ops;
}
function every(mem, key, ms, now) { const t = mem['t_' + key]; if (t == null || now - t >= ms) { mem['t_' + key] = now; return true; } return false; }

const P = {};

// KICKBACK: aim by turning (hold left/right in alternating bursts) and fire constantly. Every shot kicks you backward.
P.kickback = {
  unlock: 'Space', every: 60,
  read: () => { const s = __game.getState(); return { over: s.over, wave: s.wave }; },
  step(st, ms, mem, cx) {
    const ph = Math.floor(ms / 700) % 4;
    const ops = holdOnly(mem, cx.careless ? [] : ph === 0 ? ['ArrowLeft'] : ph === 2 ? ['ArrowRight'] : []);
    if (every(mem, 'fire', cx.careless ? 120 : 260, ms)) ops.push(['press', 'Space']);
    return ops;
  },
};

// LOOPBACK: steer toward the nearest orb (two arrow keys held for diagonals); dash every ~2.5 s.
P.loopback = {
  unlock: 'ArrowRight', every: 50,
  read: () => { const s = __game.getState(); return { over: s.over, x: s.x, y: s.y, orbs: s.orbs.slice(0, 12) }; },
  step(st, ms, mem, cx) {
    let want = [];
    if (cx.careless) want = [Math.floor(ms / 1500) % 2 ? 'ArrowLeft' : 'ArrowRight'];   // pace back and forth across your own ghosts
    else if (st.orbs && st.orbs.length) {
      let b = null, bd = 1e9; for (const o of st.orbs) { const d = Math.hypot(o.x - st.x, o.y - st.y); if (d < bd) { bd = d; b = o; } }
      const dx = b.x - st.x, dy = b.y - st.y;
      if (Math.abs(dx) > 8) want.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      if (Math.abs(dy) > 8) want.push(dy > 0 ? 'ArrowDown' : 'ArrowUp');
    } else want = [['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][Math.floor(ms / 600) % 4]];
    const ops = holdOnly(mem, want);
    if (!cx.careless && every(mem, 'dash', 2500, ms)) ops.push(['press', 'Space']);
    return ops;
  },
};

// TILTWELL: shuffle the falling pair left/right, drop it, and tilt the well every few pieces.
P.tiltwell = {
  unlock: 'ArrowLeft', every: 140,
  read: () => { const s = __game.getState(); return { over: s.over, phase: s.phase, charges: s.charges }; },
  step(st, ms, mem, cx) {
    const ops = [];
    mem.n = (mem.n || 0) + 1;
    if (cx.careless) return mem.n % 2 ? [['press', 'Space']] : [];                // hard-drop everything in the middle
    const k = mem.n % 6;
    if (k === 1) ops.push(['press', (mem.n >> 3) & 1 ? 'ArrowLeft' : 'ArrowRight']);
    else if (k === 3) ops.push(['press', (mem.n % 5) < 2 ? 'ArrowLeft' : 'ArrowRight']);
    else if (k === 5) ops.push(['press', 'Space']);
    if (st.charges > 0 && every(mem, 'tilt', 3200, ms)) ops.push(['press', (mem.n & 2) ? 'KeyQ' : 'KeyE']);
    return ops;
  },
};

// SPELLSNAKE: greedy steering to the nearest letter with a one-step safety check; cast once the word is 3+ letters.
P.spellsnake = {
  unlock: 'Space', every: 45,
  read: () => {
    const s = __game.getState();
    return { over: s.over, cols: s.cols, rows: s.rows, dir: s.dir, head: s.head, body: s.body, tiles: s.tiles.map(t => [t.x, t.y]), rocks: s.rocks, word: s.word, lets: s.lets };
  },
  step(st, ms, mem, cx) {
    const ops = [];
    if (cx.careless) return ops;                                                    // stop steering: the wall comes
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
    const dirName = typeof st.dir === 'number' ? ['up', 'right', 'down', 'left'][st.dir] : st.dir;   // game: 0 up, 1 right, 2 down, 3 left
    const occ = new Set();
    for (const b of (st.body || []).slice(0, -1)) occ.add(b[0] + ',' + b[1]);
    (st.rocks || []).forEach((r, i) => { if (r) occ.add((i % st.cols) + ',' + Math.floor(i / st.cols)); });   // flat COLS*ROWS grid
    const h = st.head || [0, 0];
    const safe = d => { const nx = h[0] + D[d][0], ny = h[1] + D[d][1]; return nx >= 0 && ny >= 0 && nx < st.cols && ny < st.rows && !occ.has(nx + ',' + ny); };
    let tgt = null, bd = 1e9; for (const t of (st.tiles || [])) { const d = Math.abs(t[0] - h[0]) + Math.abs(t[1] - h[1]); if (d < bd) { bd = d; tgt = t; } }
    const cand = Object.keys(D).filter(d => d !== OPP[dirName] && safe(d));
    if (cand.length) {
      const score = d => { const nx = h[0] + D[d][0], ny = h[1] + D[d][1]; return tgt ? Math.abs(tgt[0] - nx) + Math.abs(tgt[1] - ny) : (d === dirName ? 0 : 1); };
      cand.sort((a, b) => score(a) - score(b) || (a === dirName ? -1 : b === dirName ? 1 : 0));
      const pick = cand[0];
      if (pick !== dirName && (mem.lastTurn !== pick || ms - (mem.lastTurnT || 0) > 150)) { ops.push(['press', DIRKEY[pick]]); mem.lastTurn = pick; mem.lastTurnT = ms; }
    }
    const len = (st.lets || '').length;
    if (len >= 3 && every(mem, 'cast', 1800, ms)) ops.push(['press', 'Space']);
    return ops;
  },
};

// PIPWALK: roll toward the nearest enemy (that is how you attack); take the first card on pick screens.
P.pipwalk = {
  unlock: 'ArrowRight', every: 120,
  read: () => { const s = __game.getState(); return { over: s.over, phase: s.phase, px: s.px, py: s.py, N: s.N, en: s.enemies.map(e => [e.x, e.y]) }; },
  step(st, ms, mem, cx) {
    if (st.phase === 'pick') return every(mem, 'pick', 600, ms) ? [['press', 'Digit1']] : [];
    if (st.phase !== 'play') return [];
    if (!every(mem, 'roll', 330, ms)) return [];
    let dx = 0, dy = 0;
    if (st.en && st.en.length) {
      let b = null, bd = 1e9; for (const e of st.en) { const d = Math.abs(e[0] - st.px) + Math.abs(e[1] - st.py); if (d < bd) { bd = d; b = e; } }
      dx = b[0] - st.px; dy = b[1] - st.py;
    }
    mem.n = (mem.n || 0) + 1;
    let k;
    if (cx.careless) k = mem.n % 2 ? 'ArrowLeft' : 'ArrowRight';                   // stall back and forth while the Dread ticks
    else if (!dx && !dy) k = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][mem.n % 4];
    else if (mem.n % 5 === 0) k = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][(mem.n / 5) % 4];
    else if (Math.abs(dx) >= Math.abs(dy)) k = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
    else k = dy > 0 ? 'ArrowDown' : 'ArrowUp';
    return [['press', k]];
  },
};

// MAZEWRIGHT: build phase: wander the cursor and drop walls, then Enter = GO; wave phase: fire the pulse; pick: card 1.
P.mazewright = {
  unlock: 'ArrowUp', every: 110,
  read: () => { const s = __game.getState(); return { over: s.over, phase: s.phase, wallsLeft: s.wallsLeft, pulse: s.pulse, en: s.enemies.length, cards: !!s.cards }; },
  step(st, ms, mem, cx) {
    const ops = [];
    mem.n = (mem.n || 0) + 1;
    if (cx.careless && st.phase === 'build') return every(mem, 'go', 400, ms) ? [['press', 'Enter']] : [];   // no walls, send the wave
    if (cx.careless && st.phase === 'wave') return [];
    if (st.phase === 'build') {
      const k = mem.n % 4;
      if (k < 2) ops.push(['press', ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'ArrowUp'][(mem.n >> 1) % 6]]);
      else if (k === 2 && st.wallsLeft > 0) ops.push(['press', 'Space']);
      else if (st.wallsLeft === 0 || (mem.buildN = (mem.buildN || 0) + 1) > 30) { ops.push(['press', 'Enter']); mem.buildN = 0; }
    } else if (st.phase === 'wave') {
      if (st.pulse > 0 && st.en > 0 && every(mem, 'pulse', 1500, ms)) ops.push(['press', 'Space']);
      else if (mem.n % 5 === 0) ops.push(['press', ['ArrowLeft', 'ArrowRight'][(mem.n / 5) & 1]]);
    } else if (st.phase === 'pick' && st.cards) {
      if (every(mem, 'pick', 700, ms)) ops.push(['press', 'Digit1']);
    }
    return ops;
  },
};

// COMPOUND: buy a shop card (1/2/3), move the cursor, place it; reroll now and then.
P.compound = {
  unlock: 'ArrowRight', every: 130,
  read: () => { const s = __game.getState(); return { over: s.over, sel: s.sel, afford: s.shop.map(c => c.afford) }; },
  step(st, ms, mem, cx) {
    mem.n = (mem.n || 0) + 1;
    if (cx.careless) return mem.n % 8 === 0 ? [['press', 'ArrowRight']] : [];     // stop building; the tide keeps rising
    const k = mem.n % 5;
    if (k === 0) { const i = (st.afford || []).findIndex(a => a); return [['press', 'Digit' + (i >= 0 ? i + 1 : 1 + (mem.n % 3))]]; }
    if (k === 1 || k === 2) return [['press', ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowDown'][(mem.n + k) % 7]]];
    if (k === 3) return [['press', 'Space']];
    if (mem.n % 60 === 4) return [['press', 'KeyR']];
    return [];
  },
};

// JUNK ORBIT: sweep the aim left/right and fire every ~1.1 s.
P.junkorbit = {
  unlock: 'ArrowLeft', every: 70,
  read: () => { const s = __game.getState(); return { over: s.over, aim: s.aim, aimMax: s.aimMax, cool: s.cool }; },
  step(st, ms, mem, cx) {
    if (mem.sw == null) mem.sw = 1;
    if (st.aim > st.aimMax * 0.8) mem.sw = -1; else if (st.aim < -st.aimMax * 0.8) mem.sw = 1;
    const ph = Math.floor(ms / 450) % 3;
    const ops = holdOnly(mem, ph === 2 ? [] : [mem.sw > 0 ? 'ArrowRight' : 'ArrowLeft']);
    if (every(mem, 'fire', cx.careless ? 350 : 1100, ms)) ops.push(['press', 'Space']);
    return ops;
  },
};

// MAGSUMO (solo vs CPU): steer at the CPU puck, flip polarity every ~1.4 s.
P.magsumo = {
  unlock: 'ArrowUp', every: 60,
  read: () => { const s = __game.getState(); return { over: s.over, phase: s.phase, me: s.me, foe: s.foe, c: s.center, ringR: s.ringR }; },
  step(st, ms, mem, cx) {
    if (!st.me || !st.foe) return [];
    let tx = st.foe.x, ty = st.foe.y;
    const dc = Math.hypot(st.me.x - st.c.x, st.me.y - st.c.y);
    if (cx.careless) { tx = st.me.x + (st.me.x - st.c.x) * 3 + 1; ty = st.me.y + (st.me.y - st.c.y) * 3; }   // drift out of the ring
    else if (dc > st.ringR * 0.75) { tx = st.c.x; ty = st.c.y; }       // too close to the edge: come back to the middle
    const dx = tx - st.me.x, dy = ty - st.me.y, want = [];
    if (Math.abs(dx) > 10) want.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
    if (Math.abs(dy) > 10) want.push(dy > 0 ? 'ArrowDown' : 'ArrowUp');
    const ops = holdOnly(mem, want);
    if (every(mem, 'flip', 1400, ms)) ops.push(['press', 'Space']);
    return ops;
  },
};

// UPTEMPO is played by a dedicated timing loop in audio.js (it schedules each key press for the moment its note
// crosses the hit line). This entry only supplies the unlock key.
P.uptempo = { unlock: 'Space', every: 0, read: null, step: null };

module.exports = { POLICIES: P };
