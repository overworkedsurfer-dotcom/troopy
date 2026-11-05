// Bots for games/mazewright.html. decide() functions are stringified and run inside the page.
// Actions: build/wave = none/up/down/left/right/place (cursor moves are one-shot; place = wall / undo / start on core / pulse in wave)
//          pick = none/left/right/place
module.exports = {
  bots: {
    random: {
      decisionMs: 150,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Greedy one-wall-at-a-time maze builder (maximise path cells inside turret range), always places every wall,
    // fixed upgrade priority, pulses when something is about to reach the core.
    heuristic: {
      decisionMs: 150,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.phase === 'pick') {
          const pri = ['dmg', 'rate', 'walls', 'range', 'pierce', 'splash', 'slow', 'twin', 'crit', 'cap', 'repair', 'bounty', 'glass'];
          let bi = 0, bv = 99; s.cards.forEach((c, i) => { const v = pri.indexOf(c); if (v < bv) { bv = v; bi = i; } });
          if (s.sel !== bi) return 'right';
          return 'place';
        }
        if (s.phase === 'wave') {
          if (s.pulse > 0 && s.enemies.some(e => e.rem < 1.4)) return 'place';
          return 'none';
        }
        if (s.phase !== 'build') return 'none';
        const N = s.N, CI = s.core[0] + s.core[1] * N, D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        function bfs(walls) { const d = new Array(N * N).fill(999); d[CI] = 0; const q = [CI]; let h = 0; while (h < q.length) { const c = q[h++], x = c % N, y = (c / N) | 0; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const ni = nx + ny * N; if (walls[ni] || d[ni] < 999) continue; d[ni] = d[c] + 1; q.push(ni); } } return d; }
        const gi = s.allGates.map(g => g[0] + g[1] * N);
        function score(walls) {
          const d = bfs(walls); let v = 0;
          for (let k = 0; k < gi.length; k++) { if (d[gi[k]] >= 999) return -1; v += d[gi[k]] * (s.gateIdx.indexOf(k) >= 0 ? 1 : 0.3); }
          return v;
        }
        if (!mem.plan || mem.planWave !== s.wave || mem.planLeft !== s.wallsLeft) {
          mem.planWave = s.wave; mem.planLeft = s.wallsLeft;
          let target = null;
          if (s.wallsLeft > 0) {
            const w = s.walls.slice(); let bv = score(w);
            for (let i = 0; i < N * N; i++) { if (w[i] || i === CI || gi.indexOf(i) >= 0) continue; w[i] = 1; const v = score(w); w[i] = 0; if (v > bv) { bv = v; target = i; } }
          }
          mem.plan = target == null ? CI : target;
        }
        const tx = mem.plan % N, ty = (mem.plan / N) | 0;
        if (s.cur[0] < tx) return 'right'; if (s.cur[0] > tx) return 'left';
        if (s.cur[1] < ty) return 'down'; if (s.cur[1] > ty) return 'up';
        if (s.lock > 0) return 'none';
        mem.planLeft = -1;                       // re-plan after this placement
        return 'place';
      },
    },

    // Plans walls with a pair lookahead over the weighted sum of gate->core BFS path lengths (all 4 gates matter
    // eventually; active gates weigh more). Then uses snapshot/restore to simulate the coming wave for each
    // "how many walls to keep in hand" option (greed bank vs leaks) and plays the best. State-aware card values.
    smart: {
      decisionMs: 150,
      decide: function (G, rng, mem) {
        const s = G.getState();
        const N = s.N, CI = s.core[0] + s.core[1] * N, D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        const gi = s.allGates.map(g => g[0] + g[1] * N);
        function bfs(walls) { const d = new Array(N * N).fill(999); d[CI] = 0; const q = [CI]; let h = 0; while (h < q.length) { const c = q[h++], x = c % N, y = (c / N) | 0; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const ni = nx + ny * N; if (walls[ni] || d[ni] < 999) continue; d[ni] = d[c] + 1; q.push(ni); } } return d; }
        function metric(walls, act) {
          const d = bfs(walls); let v = 0, mn = 999;
          for (let k = 0; k < gi.length; k++) { const L = d[gi[k]]; if (L >= 999) return -1e9; v += L * (act.indexOf(k) >= 0 ? 1.6 : 1); if (L < mn) mn = L; }
          return v + mn * 2;
        }
        // beam search over which free cells to wall this wave (width 8), maximising the path metric
        function plan(walls, n, act) {
          const free = []; for (let i = 0; i < N * N; i++) if (!walls[i] && i !== CI && gi.indexOf(i) < 0) free.push(i);
          let beam = [{ w: walls.slice(), cells: [], v: metric(walls, act) }];
          let bestNode = beam[0];
          for (let k = 0; k < n; k++) {
            const cand = [], seen = {};
            for (const node of beam) {
              for (const i of free) {
                if (node.w[i]) continue;
                const key = node.cells.concat([i]).sort((a, b) => a - b).join(',');
                if (seen[key]) continue; seen[key] = 1;
                node.w[i] = 1; const v = metric(node.w, act); node.w[i] = 0;
                if (v > -1e8) cand.push({ parent: node, i, v });
              }
            }
            if (!cand.length) break;
            cand.sort((a, b) => b.v - a.v);
            beam = cand.slice(0, 8).map(c => { const w = c.parent.w.slice(); w[c.i] = 1; return { w, cells: c.parent.cells.concat([c.i]), v: c.v }; });
            if (beam[0].v > bestNode.v + 0.01) bestNode = beam[0];
          }
          // only keep walls that actually help (the rest stay in hand for the greed bank)
          return bestNode.cells;
        }
        function nav(st, target) {
          const tx = target % N, ty = (target / N) | 0;
          if (st.cur[0] < tx) return 'right'; if (st.cur[0] > tx) return 'left';
          if (st.cur[1] < ty) return 'down'; if (st.cur[1] > ty) return 'up';
          return 'place';
        }
        function pulsePolicy(st) {
          if (st.pulse <= 0 || !st.enemies.length) return false;
          if (st.enemies.some(e => e.rem < 1.4)) return true;
          if (st.pulse > 1 || st.pending === 0) {
            const R = st.tur.range; let inR = 0, hp = 0;
            for (const e of st.enemies) if (Math.hypot(e.x - st.core[0] - 0.5, e.y - st.core[1] - 0.5) <= R) { inR++; hp += e.hp; }
            if (inR >= 5 && hp > st.tur.dmg * 12) return true;
          }
          return false;
        }
        // simulate: place `cells` (in order) then start the wave, run it to the end (with the pulse policy)
        function simWave(cells) {
          let st = G.getState(), guard = 0;
          const todo = cells.concat([CI]);
          while (todo.length && guard++ < 300 && st.phase === 'build') {
            const a = nav(st, todo[0]);
            G.input(a); G.tick(a === 'place' ? 120 : 0);
            if (a === 'place') todo.shift();
            st = G.getState();
          }
          let t = 0;
          while (!G.isOver() && st.phase === 'wave' && t < 150000) {
            if (pulsePolicy(st)) G.input('place');
            G.tick(200); t += 200; st = G.getState();
          }
          return st;
        }
        if (s.phase === 'pick') {
          if (s.lock > 0) return 'none';
          if (mem.pickWave !== s.wave) {
            const T = s.tur, miss = s.coreMax - s.coreHp, late = s.wave >= 8;
            const val = { dmg: 10, rate: 9.6, walls: s.wave <= 9 ? 8.6 : 5, splash: T.splash < 0.7 ? 7.6 : 4, pierce: T.pierce < 3 ? 7.4 : 4,
              range: T.range < 4.7 ? 7.2 : 3, twin: 7.8, slow: 6.6, crit: 6.4, cap: 5, repair: miss * 1.1 + (s.coreHp <= 8 ? 3 : 0),
              bounty: s.coreHp >= 14 ? 6 : 3, glass: (s.coreHp >= 18 && late) ? 5 : -10 };
            let bi = 0, bv = -1e9; s.cards.forEach((c, i) => { const v = val[c] == null ? 0 : val[c]; if (v > bv) { bv = v; bi = i; } });
            mem.pickWave = s.wave; mem.pickIdx = bi;
          }
          if (s.sel !== mem.pickIdx) return 'right';
          return 'place';
        }
        if (s.phase === 'wave') return pulsePolicy(s) ? 'place' : 'none';
        if (s.phase !== 'build') return 'none';
        if (!mem.bplan || mem.bWave !== s.wave) {
          mem.bWave = s.wave;
          const cells = plan(s.walls, s.wallsLeft, s.gateIdx);
          // greed: how many planned walls to place now; the rest stay in hand and bank x(1+min(4,hand))
          const snap = G.snapshot(); G.quiet(true);
          const res = [];
          for (let k = cells.length; k >= Math.max(0, cells.length - 4); k--) {
            G.restore(snap);
            const st1 = simWave(cells.slice(0, k));
            res.push({ k, gain: st1.score - s.score, loss: s.coreHp - st1.coreHp, over: st1.over });
          }
          G.restore(snap); G.quiet(false);
          const gmax = Math.max(1, ...res.map(r => r.gain));
          const pen = Math.max(1500 * Math.pow(1.2, s.wave - 1), 1.6 * gmax) * (s.coreHp <= 8 ? 2.5 : 1);
          let bk = cells.length, bv = -Infinity;
          for (const r of res) { const v = r.gain - r.loss * pen - (r.over ? 1e12 : 0); if (v > bv) { bv = v; bk = r.k; } }
          mem.bplan = cells.slice(0, bk).concat([CI]);
        }
        if (s.lock > 0) return 'none';
        while (mem.bplan.length > 1 && s.walls[mem.bplan[0]]) mem.bplan.shift();
        const tgt = mem.bplan[0];
        const a = nav(s, tgt);
        if (a === 'place' && tgt !== CI) mem.bplan.shift();
        return a;
      },
    },
  },
};
