// Bots for games/emberdeep.html. decide() functions are stringified and run inside the page.
// Actions: play = none/up/down/left/right/flare (one-shot, buffered; moving into a wall waits a turn);
// draft = none/pick1/pick2/pick3.
module.exports = {
  bots: {
    random: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb, one ply: flare when 2+ foes are adjacent (or a Shade while dim), take free/killing bumps,
    // otherwise walk a BFS field toward the current goal (brazier when low, embers, frontier, stairs) avoiding red tiles.
    heuristic: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (!s.ready) return null;
        if (s.phase === 'draft') {
          const pref = ['heart', 'phoenix', 'iron', 'teeth', 'brand', 'bellows', 'tallow', 'kindling', 'lantern', 'hearth', 'crown', 'purse', 'wick'];
          let bi = 0, bv = 1e9;
          s.cards.forEach((c, i) => { let v = pref.indexOf(c); if (v < 0) v = 40; if (c === 'kindle') v = s.hp <= s.maxHp - 4 ? -1 : 60; if (v < bv) { bv = v; bi = i; } });
          return 'pick' + (bi + 1);
        }
        if (s.phase !== 'play') return null;
        const Wd = s.W, Hd = s.H, N = Wd * Hd, D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const idx = (x, y) => x + y * Wd;
        const inB = (x, y) => x >= 0 && y >= 0 && x < Wd && y < Hd;
        const walk = i => s.map[i] !== 0;
        const dz = {}; for (const d of s.danger) dz[idx(d[0], d[1])] = (dz[idx(d[0], d[1])] || 0) + d[2];
        const enAt = {}; for (const e of s.enemies) enAt[idx(e.x, e.y)] = e;
        const near = s.enemies.filter(e => e.visible && Math.max(Math.abs(e.x - s.px), Math.abs(e.y - s.py)) <= 1);
        if (s.canFlare && (near.length >= 2 || (s.dim && near.some(e => e.type === 'shade'))) && (s.oil > 0 || s.hp - s.flareCost >= 2)) return 'flare';
        let bd = null, bv = -1;
        for (const k in D) {
          const nx = s.px + D[k][0], ny = s.py + D[k][1]; if (!inB(nx, ny)) continue;
          const e = enAt[idx(nx, ny)]; if (!e) continue;
          let v = 1;
          if (e.hp <= s.bumpDmg) v = 10; else if (e.type === 'husk' && (!e.ready || !e.awake)) v = 6; else if (e.type === 'warden' && e.next === 'charge') v = 6;
          if (v > bv) { bv = v; bd = k; }
        }
        if (bd && bv >= 5) return bd;
        // goals
        const goals = [];
        const seen = i => s.seen[i];
        const unlit = s.braziers.filter(b => !b.lit && seen(idx(b.x, b.y)));
        const doomSoon = s.ft >= s.doomAt - 6;
        const si = idx(s.stairs[0], s.stairs[1]);
        const frontier = [];
        for (let i = 0; i < N; i++) {
          if (!walk(i) || !seen(i)) continue;
          const x = i % Wd, y = (i / Wd) | 0;
          for (const k in D) { const nx = x + D[k][0], ny = y + D[k][1]; if (inB(nx, ny) && !seen(idx(nx, ny))) { frontier.push(i); break; } }
        }
        if (s.hp <= s.maxHp * 0.5 && unlit.length) for (const b of unlit) goals.push(idx(b.x, b.y));
        if (!goals.length && s.sealed) { const w = s.enemies.find(e => e.type === 'warden'); if (w && seen(idx(w.x, w.y))) goals.push(idx(w.x, w.y)); }
        if (!goals.length && !doomSoon) for (const it of s.items) if (seen(idx(it.x, it.y))) goals.push(idx(it.x, it.y));
        if (!goals.length && seen(si) && !s.sealed && (doomSoon || !frontier.length)) goals.push(si);
        if (!goals.length) for (const i of frontier) goals.push(i);
        if (!goals.length && seen(si)) goals.push(si);
        const dist = new Array(N).fill(999), q = [];
        for (const g of goals) { dist[g] = 0; q.push(g); }
        for (let h = 0; h < q.length; h++) {
          const i = q[h], x = i % Wd, y = (i / Wd) | 0;
          for (const k in D) { const nx = x + D[k][0], ny = y + D[k][1]; if (!inB(nx, ny)) continue; const ni = idx(nx, ny); if (!walk(ni) || dist[ni] < 999) continue; dist[ni] = dist[i] + 1; q.push(ni); }
        }
        let best = null, bestV = Infinity;
        const here = idx(s.px, s.py);
        for (const k in D) {
          const nx = s.px + D[k][0], ny = s.py + D[k][1];
          let v;
          if (!inB(nx, ny) || !walk(idx(nx, ny))) v = dist[here] * 10 + (dz[here] || 0) * 25 + 6;
          else if (enAt[idx(nx, ny)]) v = dist[here] * 10 + (dz[here] || 0) * 25 - 2;
          else v = dist[idx(nx, ny)] * 10 + (dz[idx(nx, ny)] || 0) * 25;
          v += rng() * 0.5;
          if (v < bestV) { bestV = v; best = k; }
        }
        return best || 'up';
      },
    },

    // Exhaustive 2-ply lookahead with snapshot/restore (5 x 5 futures), quiet mode.
    // Leaf = light (HP) above all, then progress along a BFS field toward a goal (brazier when low, embers, frontier,
    // stairs when the dark is near), danger on the tile, threats, kills, score. Anti-oscillation on recent cells.
    smart: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const s0 = G.getState();
        if (!s0.ready) return null;
        if (s0.phase === 'draft') {
          const miss = s0.maxHp - s0.hp, r = s0.relics;
          const val = { heart: 42, phoenix: 46, iron: 22 + (s0.depth >= 5 ? 10 : 0), teeth: 30, brand: 26 + r.lantern * 6, bellows: 26, tallow: 30, kindling: 20 + r.bellows * 4,
            lantern: 18 + r.brand * 8, hearth: 28, crown: 18 + r.bellows * 4, purse: 12 + r.iron * 4, wick: s0.maxHp >= 10 ? 22 : -30, kindle: miss * 7.5 };
          let bi = 0, bv = -1e9;
          s0.cards.forEach((c, i) => { const v = val[c] == null ? 0 : val[c]; if (v > bv) { bv = v; bi = i; } });
          return 'pick' + (bi + 1);
        }
        if (s0.phase !== 'play') return null;
        const Wd = s0.W, Hd = s0.H, N = Wd * Hd, DL = ['up', 'down', 'left', 'right'], D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const idx = (x, y) => x + y * Wd;
        const inB = (x, y) => x >= 0 && y >= 0 && x < Wd && y < Hd;
        const walk = i => s0.map[i] !== 0, seen = i => s0.seen[i];
        if (mem.depth !== s0.depth) { mem.depth = s0.depth; mem.hist = []; }
        // ---- pick a goal and build its distance field ----
        const unlit = s0.braziers.filter(b => !b.lit && seen(idx(b.x, b.y)));
        const si = idx(s0.stairs[0], s0.stairs[1]), stairsSeen = seen(si);
        const left = s0.doomAt - s0.ft;
        const frontier = [];
        for (let i = 0; i < N; i++) {
          if (!walk(i) || !seen(i)) continue;
          const x = i % Wd, y = (i / Wd) | 0;
          for (const k of DL) { const nx = x + D[k][0], ny = y + D[k][1]; if (inB(nx, ny) && !seen(idx(nx, ny))) { frontier.push(i); break; } }
        }
        const field = (goals) => {
          const dist = new Array(N).fill(999), q = [];
          for (const g of goals) { dist[g] = 0; q.push(g); }
          for (let h = 0; h < q.length; h++) {
            const i = q[h], x = i % Wd, y = (i / Wd) | 0;
            for (const k of DL) { const nx = x + D[k][0], ny = y + D[k][1]; if (!inB(nx, ny)) continue; const ni = idx(nx, ny); if (!walk(ni) || dist[ni] < 999) continue; dist[ni] = dist[i] + 1; q.push(ni); }
          }
          return dist;
        };
        let goals = [], wantStairs = false;
        const fromMe = field([idx(s0.px, s0.py)]);
        const stairsD = stairsSeen ? fromMe[si] : 99;
        if (s0.hp <= s0.maxHp * 0.45 && unlit.length) goals = unlit.map(b => idx(b.x, b.y));
        if (!goals.length && s0.sealed) { const w = s0.enemies.find(e => e.type === 'warden'); if (w && seen(idx(w.x, w.y))) goals = [idx(w.x, w.y)]; }
        if (!goals.length) {
          const its = s0.items.filter(it => seen(idx(it.x, it.y))).map(it => idx(it.x, it.y)).filter(i => fromMe[i] + (stairsSeen ? 0 : 6) < left - 4);
          if (its.length) goals = its;
        }
        if (!goals.length && frontier.length && (left > (stairsSeen ? stairsD + 14 : 6))) goals = frontier;
        if (!goals.length && stairsSeen && !s0.sealed) { goals = [si]; wantStairs = true; }
        if (!goals.length) goals = frontier.length ? frontier : [si];
        const dist = field(goals);
        // ---- lookahead ----
        const snap = G.snapshot();
        G.quiet(true);
        function adv(a) {
          G.input(a); G.tick(200);
          let s = G.getState(), k = 0;
          while (!s.over && !s.ready && k < 40) { G.tick(50); s = G.getState(); k++; }
          return s;
        }
        function evalS(s) {
          if (s.over) return -1e9;
          if (s.phase === 'draft' || s.depth > s0.depth) return (wantStairs ? 2e5 : 4000) + s.hp * 1500 + (s.score - s0.score) * 2;
          const i = idx(s.px, s.py);
          let v = s.hp * 1000 + s.maxHp * 150 + (s.score - s0.score) * 2.5 + s.oil * 600 - s.gloom * 300;
          v -= Math.min(60, dist[i]) * 140;
          let dz = 0; for (const d of s.danger) if (d[0] === s.px && d[1] === s.py) dz += d[2];
          v -= dz * 1300;
          for (const e of s.enemies) {
            const md = Math.abs(e.x - s.px) + Math.abs(e.y - s.py);
            if (e.type === 'shade') { if (s.dim && md <= 4) v -= 1200 / md; }
            else if (md <= 3 && (e.awake || e.type === 'moth')) v -= e.hp * 50 * (e.type === 'moth' && !e.aware ? 0.3 : 1);
          }
          v += (s.kills - s0.kills) * 300;
          if (s.dim) v -= 500;
          return v;
        }
        const acts = G.getActions().filter(a => a !== 'none');
        let bestA = null, bestV = -Infinity;
        for (const a of acts) {
          G.restore(snap);
          const s1 = adv(a);
          let v;
          if (s1.over || s1.phase !== 'play') v = evalS(s1);
          else {
            const sn1 = G.snapshot();
            const a2s = DL.slice(); if (s1.canFlare) a2s.push('flare');
            let b2 = -Infinity;
            for (const a2 of a2s) { G.restore(sn1); const v2 = evalS(adv(a2)); if (v2 > b2) b2 = v2; }
            v = 0.25 * evalS(s1) + 0.75 * b2;
          }
          if (s1.phase === 'play' && !s1.over) { const k1 = idx(s1.px, s1.py); let rep = 0; for (const h of mem.hist) if (h === k1) rep++; v -= rep * 220; }
          v += rng() * 0.01;
          if (v > bestV) { bestV = v; bestA = a; }
        }
        G.restore(snap);
        G.quiet(false);
        mem.hist.push(idx(s0.px, s0.py)); if (mem.hist.length > 10) mem.hist.shift();
        return bestA || 'up';
      },
    },
  },
};
