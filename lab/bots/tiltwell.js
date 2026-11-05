// Bots for games/tiltwell.html. decide() functions are stringified and run inside the page.
module.exports = {
  bots: {
    random: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb: pick the column whose landing spot touches the most same-coloured cells,
    // avoid tall columns, and tilt only in an emergency (spawn area nearly blocked).
    heuristic: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over || s.phase !== 'fall' || !s.piece) return 'none';
        const N = s.N, g = s.grid, p = s.piece;
        const h = [];
        for (let x = 0; x < N; x++) { let y = 0; while (y < N && !g[y * N + x]) y++; h.push(N - y); }
        if ((h[3] >= 6 || h[4] >= 6) && s.charges >= 1 && mem.tiltNo !== s.pieceNo) {
          mem.tiltNo = s.pieceNo;
          let l = 0, r = 0; for (let x = 0; x < N; x++) { if (x < N / 2) l += h[x]; else r += h[x]; }
          return l <= r ? 'tiltL' : 'tiltR';
        }
        if (mem.no !== s.pieceNo) {
          mem.no = s.pieceNo;
          let bestX = p.x, bestV = -1e9;
          const maxX = p.o === 0 ? N - 2 : N - 1;
          for (let x = 0; x <= maxX; x++) {
            const cells = p.o === 0 ? [[x, N - 1 - h[x], p.a], [x + 1, N - 1 - h[x + 1], p.b]]
              : [[x, N - 2 - h[x], p.a], [x, N - 1 - h[x], p.b]];
            if (cells.some(c => c[1] < 0)) continue;
            let v = 0;
            for (const [cx, cy, col] of cells) {
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || nx >= N || ny < 0 || ny >= N) continue;
                const nv = g[ny * N + nx];
                if (nv === col) v += 10; else if (nv) v -= 2;
              }
              v -= (N - cy) * 2;
            }
            if (p.o === 1 && p.a === p.b) v += 6;
            if (p.o === 0 && p.a === p.b) v += 6;
            v -= Math.abs(x - 3.5) * 0.5;
            if (v > bestV) { bestV = v; bestX = x; }
          }
          mem.col = bestX;
        }
        if (p.x < mem.col) return 'right';
        if (p.x > mem.col) return 'left';
        return 'drop';
      },
    },

    // Exact placement search: for every (optional tilt, target column) plan, replay it through the real
    // game with the same 100 ms cadence as the runner until the next piece spawns, then score the board.
    // A small beam goes one piece deeper using the known NEXT piece.
    smart: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const st = G.getState();
        if (st.over || st.phase !== 'fall' || !st.piece) return 'none';
        function policy(s, plan) {
          if (s.phase !== 'fall' || !s.piece) return 'none';
          if (plan.tilt && !plan.tilted) { plan.tilted = true; return plan.tilt; }
          if (s.piece.x < plan.col) return 'right';
          if (s.piece.x > plan.col) return 'left';
          return 'drop';
        }
        if (mem.plan && mem.plan.no === st.pieceNo) return policy(st, mem.plan);

        function evalS(s) {
          if (s.over) return -1e7;
          const N = s.N, g = s.grid;
          let v = 0, sumH = 0, stones = 0, pairs = 0, bump = 0;
          const h = [];
          for (let x = 0; x < N; x++) { let y = 0; while (y < N && !g[y * N + x]) y++; h.push(N - y); sumH += N - y; }
          for (let x = 0; x < N; x++) {
            if (x < N - 1) bump += Math.abs(h[x] - h[x + 1]);
            if (h[x] > 5) v -= (h[x] - 5) * (h[x] - 5) * 45;
          }
          const mid = Math.max(h[3], h[4]);
          if (mid >= 7) v -= 4000; else if (mid >= 6) v -= 700;
          for (let i = 0; i < N * N; i++) {
            const c = g[i]; if (!c) continue;
            if (c === s.stone) { stones++; continue; }
            const x = i % N;
            if (x < N - 1 && g[i + 1] === c) pairs++;
            if (i + N < N * N && g[i + N] === c) pairs++;
          }
          v += pairs * 9 - stones * 14 - sumH * 3 - bump * 2.5;
          v += Math.min(3, s.charges) * 55;
          v -= s.gCount * (s.gIn <= 1 ? 14 : 6);
          return v;
        }
        function plans(s) {
          const out = [], tilts = s.charges >= 1 ? [null, 'tiltL', 'tiltR'] : [null];
          const maxX = s.piece.o === 0 ? s.N - 2 : s.N - 1;
          for (const t of tilts) for (let c = 0; c <= maxX; c++) out.push({ tilt: t, col: c, tilted: false });
          return out;
        }
        function run(snap, s0, plan) {
          G.restore(snap);
          const p = { tilt: plan.tilt, col: plan.col, tilted: false };
          let s = s0;
          for (let n = 0; n < 45; n++) {
            G.input(policy(s, p)); G.tick(100);
            s = G.getState();
            if (s.over || (s.pieceNo !== s0.pieceNo && s.phase === 'fall')) break;
          }
          return s;
        }
        const snap = G.snapshot();
        G.quiet(true);
        const first = [];
        for (const pl of plans(st)) {
          const s1 = run(snap, st, pl);
          first.push({ pl, s1, gain: s1.score - st.score, v: (s1.score - st.score) + evalS(s1), snap: (!s1.over && s1.phase === 'fall' && s1.piece ? G.snapshot() : null) });
        }
        first.sort((a, b) => b.v - a.v);
        let bestPl = first[0].pl, bestV = -Infinity;
        const K = Math.min(4, first.length);
        for (let i = 0; i < first.length; i++) {
          const f = first[i];
          let v = f.v;
          if (i < K && f.snap) {
            let b2 = -Infinity;
            for (const pl2 of plans(f.s1)) {
              const s2 = run(f.snap, f.s1, pl2);
              const v2 = (s2.score - f.s1.score) + evalS(s2);
              if (v2 > b2) b2 = v2;
            }
            v = f.gain + 0.9 * b2;
          } else if (i >= K) v = f.v - 1e5;   // unexplored: only a fallback
          if (v > bestV) { bestV = v; bestPl = f.pl; }
        }
        G.restore(snap);
        G.quiet(false);
        mem.plan = { no: st.pieceNo, tilt: bestPl.tilt, col: bestPl.col, tilted: false };
        return policy(st, mem.plan);
      },
    },
  },
};
