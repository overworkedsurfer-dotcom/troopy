// Bots for games/_example.html. decide() functions are stringified and run inside the page.
module.exports = {
  bots: {
    random: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb: move away from the nearest block above you, drift toward coins.
    heuristic: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const s = G.getState();
        let threat = null, td = 1e9;
        for (const b of s.blocks) {
          if (b.y + b.h < s.py - 160 || b.y > s.py + 10) continue;
          const cx = b.x + b.w / 2, d = Math.abs(cx - s.px) - b.w / 2;
          if (d < 40 && d < td) { td = d; threat = b; }
        }
        if (threat) return (threat.x + threat.w / 2) > s.px ? (s.px > 40 ? 'left' : 'right') : (s.px < s.W - 40 ? 'right' : 'left');
        if (s.coins.length) { const c = s.coins[0]; if (Math.abs(c.x - s.px) > 12) return c.x > s.px ? 'right' : 'left'; }
        return 'none';
      },
    },

    // Lookahead: for each action, hold it for 300 ms then continue with 'none' for 500 ms;
    // score = survival * big + game score gained; tie-break toward centre.
    smart: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const acts = G.getActions();
        if (acts.length === 1) return acts[0];
        const snap = G.snapshot();
        G.quiet(true);
        let bestA = 'none', bestV = -Infinity;
        for (const a of acts) {
          for (const follow of ['none', 'left', 'right']) {
            G.restore(snap);
            const s0 = G.score();
            G.input(a); G.tick(300);
            G.input(follow); G.tick(500);
            const st = G.getState();
            const v = (st.over ? -1e6 : 0) + (st.score - s0) - Math.abs(st.px - st.W / 2) * 0.01;
            if (v > bestV) { bestV = v; bestA = a; }
          }
        }
        G.restore(snap);
        G.quiet(false);
        return bestA;
      },
    },
  },
};
