// Bots for games/loopback.html. decide() functions are stringified and run inside the page.
module.exports = {
  bots: {
    random: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb: score each cardinal move by where it puts you in 150/300 ms against where
    // each ghost will be then (ghost futures come from getState); go toward the nearest orb
    // among the safe moves; dash when every move looks unsafe.
    heuristic: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over) return 'none';
        const V = 2.9, D = { none: [0, 0], up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const cl = (v, a, b) => Math.max(a, Math.min(b, v));
        let orb = null, od = 1e9;
        for (const o of s.orbs) { const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < od) { od = d; orb = o; } }
        let bestA = 'none', bestV = -1e9;
        for (const a in D) {
          const dx = D[a][0], dy = D[a][1];
          const p1x = cl(s.x + dx * V * 9, s.ax0 + 7, s.ax1 - 7), p1y = cl(s.y + dy * V * 9, s.ay0 + 7, s.ay1 - 7);
          const p2x = cl(s.x + dx * V * 18, s.ax0 + 7, s.ax1 - 7), p2y = cl(s.y + dy * V * 18, s.ay0 + 7, s.ay1 - 7);
          let dmin = 1e9;
          for (const g of s.ghosts) {
            const d1 = Math.hypot(p1x - (g.x + g.x3) / 2, p1y - (g.y + g.y3) / 2), d2 = Math.hypot(p2x - g.x3, p2y - g.y3);
            dmin = Math.min(dmin, d1, d2);
          }
          let v = 0;
          if (dmin < 16) v -= 1000; else if (dmin < 40) v -= (40 - dmin) * 8;
          if (orb) v -= Math.hypot(orb.x - p2x, orb.y - p2y);
          if (a === 'none') v -= 5;
          if (v > bestV) { bestV = v; bestA = a; }
        }
        if (bestV <= -900 && s.dashCd <= 0) return 'dash';
        return bestA;
      },
    },

    // Lookahead: each action for 200 ms, then each cardinal follow-up (or stop) for 500 ms.
    // Value = survival >> score gained + orb progress - ghost proximity + keeping dash ready.
    smart: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const acts = G.getActions();
        if (acts.length === 1) return acts[0];
        const snap = G.snapshot();
        G.quiet(true);
        const s0 = G.getState();
        function value(st) {
          let v = 0;
          const gain = st.score - s0.score;
          if (gain > 0) v += 40 * Math.log(1 + gain / 20);
          v += (st.orbsGot - s0.orbsGot) * 60 + (st.mult - s0.mult) * 40;
          let od = 1e9;
          for (const o of st.orbs) od = Math.min(od, Math.hypot(o.x - st.x, o.y - st.y) * (o.gold ? 0.8 : 1));
          if (od < 1e9) v -= od * 0.35;
          for (const g of st.ghosts) {
            const d = Math.min(Math.hypot(g.x - st.x, g.y - st.y), Math.hypot(g.x3 - st.x, g.y3 - st.y) + 6);
            if (d < 48) v -= (48 - d) * (48 - d) * 0.07;
          }
          if (st.dashCd <= 0) v += 25;
          const dw = Math.min(st.x - st.ax0, st.ax1 - st.x, st.y - st.ay0, st.ay1 - st.y);
          if (dw < 30) v -= (30 - dw) * 1.5;
          if (st.nextGhostMs < 1500) { const ds = Math.hypot(st.x - st.sx, st.y - st.sy); if (ds < 70) v -= (70 - ds) * 3; }
          return v;
        }
        const FOLLOW = ['up', 'down', 'left', 'right', 'none'];
        let bestA = 'none', bestV = -Infinity;
        for (const a of acts) {
          let va = -Infinity;
          for (const f of FOLLOW) {
            G.restore(snap);
            if (a === 'dash') { G.input(mem.prev && mem.prev !== 'dash' ? mem.prev : 'none'); G.input('dash'); } else G.input(a);
            G.tick(200);
            let v;
            if (G.isOver()) v = -1e6;
            else {
              G.input(f); G.tick(250);
              if (G.isOver()) v = -5e5;
              else { G.tick(250); v = G.isOver() ? -2.5e5 : value(G.getState()); }
            }
            if (v > va) va = v;
          }
          if (a === 'dash') va -= 20;
          if (a === mem.prev) va += 4;
          if (va > bestV) { bestV = va; bestA = a; }
        }
        G.restore(snap);
        G.quiet(false);
        if (bestA === 'dash') { if (mem.prev && mem.prev !== 'dash') G.input(mem.prev); }
        else mem.prev = bestA;
        return bestA;
      },
    },
  },
};
