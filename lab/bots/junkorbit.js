// Bots for games/junkorbit.html. decide() functions are stringified and run inside the page.
// Actions: none, left, right (held aim rotation), fire (one-shot; releases rotation).
module.exports = {
  bots: {
    random: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb (what a human does with the dotted preview): swing the aim back and forth around the
    // star closest to burning out, and fire whenever the visible preview line passes through a star.
    heuristic: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over) return 'none';
        if (s.aimHits > 0 && s.cool <= 0) return 'fire';
        let tgt = null;
        for (const st of s.stars) if (!tgt || st.fuse < tgt.fuse) tgt = st;
        if (!tgt) return 'none';
        mem.ph = (mem.ph || 0) + 0.25;
        let want = Math.atan2(tgt.x - s.launcher.x, s.launcher.y - tgt.y) + Math.sin(mem.ph) * 0.45;
        want = Math.max(-s.aimMax, Math.min(s.aimMax, want));
        const d = want - s.aim;
        if (Math.abs(d) > 0.04) return d < 0 ? 'left' : 'right';
        return 'none';
      },
    },

    // Lookahead: candidate plans "hold left/right for k decisions, then fire", each simulated
    // through a short horizon. Value = score gained + shields kept - loose junk created.
    // Compared against not firing at all, so it also takes defensive intercept shots.
    smart: {
      decisionMs: 50,
      decide: function (G, rng, mem) {
        const acts = G.getActions();
        if (acts.length === 1) return 'none';
        if (mem.plan && mem.plan.length) return mem.plan.shift();
        if (mem.wait > 0) { mem.wait--; return 'none'; }
        const s0 = G.getState();
        if (s0.cool > 250) return 'none';
        const HZ = 2400, KS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22, 26];
        const snap = G.snapshot();
        G.quiet(true);
        function value() {
          const st = G.getState();
          let loose = 0, cap = 0;
          for (const b of st.bodies) { if (!b.cap) loose++; else cap++; }
          return (st.over ? -1e6 : 0) + st.score + 3000 * st.hearts - 160 * loose + 20 * cap;
        }
        // baseline: do nothing
        G.input('none'); G.tick(HZ);
        const base = value();
        let bestV = -Infinity, bestPlan = null;
        for (const dir of ['left', 'right']) {
          G.restore(snap);
          let k = 0, edge = false;
          for (const kk of KS) {
            while (k < kk) { G.input(dir); G.tick(50); k++; }
            if (edge) break;
            if (Math.abs(G.getState().aim) >= s0.aimMax - 1e-6) edge = true;
            if (dir === 'right' && k === 0) continue;   // k=0 already tried with 'left'
            const pre = G.snapshot();
            G.input('fire'); G.tick(HZ);
            const v = value() - k * 4;
            if (v > bestV) { bestV = v; const p = []; for (let i = 0; i < k; i++) p.push(dir); p.push('fire'); bestPlan = p; }
            G.restore(pre);
          }
        }
        G.restore(snap);
        G.quiet(false);
        if (bestPlan && bestV > base + 30) { mem.plan = bestPlan; return mem.plan.shift(); }
        mem.wait = 4;
        return 'none';
      },
    },
  },
};
