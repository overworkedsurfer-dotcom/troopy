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
    // star closest to burning out and fire whenever the visible preview line passes through a star.
    // Defence: if a loose (orange) comet is close to the launcher, aim straight at it and fire.
    heuristic: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over) return 'none';
        const L = s.launcher;
        let thr = null, td = 140;
        for (const b of s.bodies) {
          if (!b.loose) continue;
          const d = Math.hypot(b.x - L.x, b.y - L.y);
          if (d < td && (L.x - b.x) * b.vx + (L.y - b.y) * b.vy > 0) { td = d; thr = b; }
        }
        let want;
        if (thr) {
          const px = thr.x + thr.vx * 0.25, py = thr.y + thr.vy * 0.25;
          want = Math.atan2(px - L.x, L.y - Math.min(py, L.y - 5));
          want = Math.max(-s.aimMax, Math.min(s.aimMax, want));
          if (Math.abs(want - s.aim) < 0.06 && s.cool <= 0) return 'fire';
        } else {
          if (s.aimHits > 0 && s.cool <= 0) return 'fire';
          let tgt = null;
          for (const st of s.stars) if (!tgt || st.fuse < tgt.fuse) tgt = st;
          if (!tgt) return 'none';
          mem.ph = (mem.ph || 0) + 0.25;
          want = Math.atan2(tgt.x - L.x, L.y - tgt.y) + Math.sin(mem.ph) * 0.45;
          want = Math.max(-s.aimMax, Math.min(s.aimMax, want));
        }
        const d = want - s.aim;
        if (Math.abs(d) > 0.04) return d < 0 ? 'left' : 'right';
        return 'none';
      },
    },

    // Lookahead: candidate plans "hold left/right for k decisions, then fire", each simulated
    // through a short horizon. Value = score + hearts kept + streak - loose debris - shots still unscored.
    // Compared against not firing at all, so it also takes defensive SAVE shots and never spams.
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
          let pend = 0;
          for (const b of st.bodies) if (b.live && !b.hit) pend++;
          return (st.over ? -1e6 : 0) + st.score + 3000 * st.hearts - 350 * st.loose - 220 * pend + 25 * st.safe + 150 * st.streak;
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
