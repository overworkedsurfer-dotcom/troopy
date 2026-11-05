// Bots for games/pipwalk.html. decide() functions are stringified and run inside the page.
// Actions: play = none/up/down/left/right (one-shot, buffered); pick = none/pick1/pick2/pick3.
module.exports = {
  bots: {
    random: {
      decisionMs: 125,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb, one ply: kill what you can kill, step out of telegraphed attacks,
    // otherwise walk toward the nearest foe preferring rolls that bring a big face up.
    heuristic: {
      decisionMs: 125,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (!s.ready) return null;
        if (s.phase === 'pick') {
          const order = ['patch', 'plus', 'odds', 'evens', 'stairs', 'twins', 'vamp', 'fire', 'quake', 'ward', 'heart', 'wild', 'mom', 'steel', 'over', 'glass'];
          let bi = 0, bv = 1e9;
          s.cards.forEach((c, i) => { let v = order.indexOf(c.type); if (c.type === 'patch' && s.hp > s.maxHp * 0.6) v = 20; if (v < bv) { bv = v; bi = i; } });
          return 'pick' + (bi + 1);
        }
        if (s.phase !== 'play') return null;
        const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const dang = {}; for (const d of s.danger) dang[d[0] + ',' + d[1]] = d[2];
        const at = (x, y) => s.enemies.find(e => e.x === x && e.y === y);
        const inB = (x, y) => x >= 0 && y >= 0 && x < s.N && y < s.N;
        const here = dang[s.px + ',' + s.py] || 0;
        // 1) kill an adjacent foe if the current top face can
        let killDir = null, killHp = -1;
        for (const k in s.bump) { const b = s.bump[k], e = at(s.px + D[k][0], s.py + D[k][1]); if (e && !e.dormant && b.dmg >= e.hp && e.hp > killHp) { killHp = e.hp; killDir = k; } }
        if (killDir) return killDir;
        // 2) candidate moves into free cells
        const live = s.enemies.filter(e => !e.dormant);
        let bestD = null, bestV = -1e9;
        for (const k in D) {
          const nx = s.px + D[k][0], ny = s.py + D[k][1];
          if (!inB(nx, ny) || at(nx, ny)) continue;
          let v = 0;
          if (dang[nx + ',' + ny]) v -= 100;
          let md = 99; for (const e of live) md = Math.min(md, Math.abs(e.x - nx) + Math.abs(e.y - ny));
          v -= md * 3;
          v += s.preview[k] * 1.5;
          if (v > bestV) { bestV = v; bestD = k; }
        }
        // 3) if not threatened and an awake foe is adjacent with a decent face up, hit it
        if (!here) {
          for (const k in s.bump) { const e = at(s.px + D[k][0], s.py + D[k][1]); if (e && !e.dormant && !s.bump[k].pinned && s.hit.v >= 3) return k; }
        }
        if (bestD && (here || bestV > -90)) return bestD;
        // 4) cornered: hit the weakest adjacent awake foe
        let hd = null, hv = 1e9;
        for (const k in D) { const e = at(s.px + D[k][0], s.py + D[k][1]); if (e && !e.dormant && e.hp < hv) { hv = e.hp; hd = k; } }
        return hd || bestD || 'up';
      },
    },

    // Exhaustive 4-ply lookahead over rolls/bumps using snapshot/restore (enemy AI is deterministic),
    // leaf = HP, threats, foe HP removed, kills, chain mult, dread pressure, room-clear bonus.
    // Root adds an anti-oscillation penalty for revisiting recent (cell, top face) states. Picks: value table.
    smart: {
      decisionMs: 125,
      decide: function (G, rng, mem) {
        const s0 = G.getState();
        if (!s0.ready) return null;
        if (s0.phase === 'pick') {
          let bi = 0, bv = -1e9;
          s0.cards.forEach((c, i) => {
            const missing = s0.maxHp - s0.hp, r = s0.relic;
            const base = { plus: 26, fire: 34, quake: 36, ward: 30, heart: 22, wild: 30, odds: 36, evens: 36, twins: 30 + r.twins * 4, stairs: 34 + r.stairs * 4,
              vamp: 28, steel: 32, glass: (s0.maxHp >= 10 && s0.hp >= 7) ? 44 : -50, mom: 18, patch: 10 + missing * 9, over: 26 };
            let v = base[c.type] || 0;
            if (c.type === 'plus' && c.faceV != null) v += c.faceV >= 5 ? 6 : 0;
            if (v > bv) { bv = v; bi = i; }
          });
          return 'pick' + (bi + 1);
        }
        if (s0.phase !== 'play') return null;
        const DL = ['up', 'down', 'left', 'right'], D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const snap = G.snapshot();
        G.quiet(true);
        const hm = Math.pow(1.32, s0.floor - 1);
        if (!mem.hist || mem.floor !== s0.floor) { mem.hist = []; mem.floor = s0.floor; }
        const key = s => s.px + ',' + s.py + ',' + s.faces[0].v;
        function adv(a) {
          G.input(a); G.tick(240);
          let s = G.getState(), k = 0;
          while (!s.over && !s.ready && s.phase === 'play' && k < 15) { G.tick(50); s = G.getState(); k++; }
          return s;
        }
        function legal(s, a) { const nx = s.px + D[a][0], ny = s.py + D[a][1]; return nx >= 0 && ny >= 0 && nx < s.N && ny < s.N; }
        function evalS(s) {
          if (s.over) return -1e7;
          let v = s.hp * 1000 + s.barrier * 450;
          if (s.phase !== 'play' || s.floor > s0.floor) return v + 40000 + (s.eliteKilled && !s0.eliteKilled ? 9000 : 0);
          let ehp = 0, md = 99;
          for (const e of s.enemies) if (!e.dormant) { ehp += e.hp; md = Math.min(md, Math.abs(e.x - s.px) + Math.abs(e.y - s.py)); }
          v -= ehp / hm * 55;
          v += (s.score - s0.score) / hm * 2;
          if (s.eliteKilled && !s0.eliteKilled) v += 9000;
          let threat = 0; for (const d of s.danger) if (d[0] === s.px && d[1] === s.py) threat += d[2];
          if (threat) {
            let safe = 0;
            const dz = {}; for (const d of s.danger) dz[d[0] + ',' + d[1]] = 1;
            for (const a of DL) { const nx = s.px + D[a][0], ny = s.py + D[a][1]; if (nx < 0 || ny < 0 || nx >= s.N || ny >= s.N) continue; if (dz[nx + ',' + ny]) continue; if (s.enemies.some(e => e.x === nx && e.y === ny)) continue; safe++; }
            v -= threat * (s.barrier ? 150 : safe ? 450 : 1100);
          } else if (md < 99) v -= md * 70;
          v += Math.min(s.chain.mult, 12) * 60;
          v += (s.kills - s0.kills) * 700;
          v -= (s.dread / s.dreadMax) * 500 + s.dreadSpawns * 900;
          return v;
        }
        function search(depth, s) {
          if (depth === 0 || s.over || s.phase !== 'play') return evalS(s);
          const sn = G.snapshot(); let bestV = -Infinity;
          for (const a of DL) {
            if (!legal(s, a)) continue;
            G.restore(sn);
            const v = search(depth - 1, adv(a));
            if (v > bestV) bestV = v;
          }
          G.restore(sn);
          return bestV === -Infinity ? evalS(s) : bestV;
        }
        let bestA = null, bestV = -Infinity;
        for (const a of DL) {
          if (!legal(s0, a)) continue;
          G.restore(snap);
          const s1 = adv(a);
          let rep = 0; const k1 = key(s1); for (const h of mem.hist) if (h === k1) rep++;
          const v = search(3, s1) + (s1.over ? -1e8 : 0) + (s1.score - s0.score) / hm * 0.5 - rep * 350 + rng() * 0.01;
          if (v > bestV) { bestV = v; bestA = a; }
        }
        G.restore(snap);
        G.quiet(false);
        mem.hist.push(key(s0)); if (mem.hist.length > 12) mem.hist.shift();
        return bestA || 'up';
      },
    },
  },
};
