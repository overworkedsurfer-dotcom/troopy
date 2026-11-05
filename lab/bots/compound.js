// Bots for games/compound.html. decide() functions are stringified and run inside the page.
module.exports = {
  bots: {
    random: {
      decisionMs: 200,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb: walk the cursor to an empty cell, then buy the cheapest card that keeps
    // at least a 1.6x margin over the tide. No adjacency planning, never rerolls.
    heuristic: {
      decisionMs: 200,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over) return 'none';
        const full = s.grid.every(c => c);
        if (!full && s.grid[s.cursor]) return 'next';
        let bk = -1, bp = Infinity;
        s.shop.forEach((c, k) => { if (c.afford && c.price < bp && (s.wealth - c.price) / s.tide >= 1.6) { bp = c.price; bk = k; } });
        if (bk < 0) return 'none';
        if (full) { if (mem.n == null) mem.n = 0; if (mem.n++ % 3) return 'next'; }
        return 'buy' + (bk + 1);
      },
    },

    // Model-based planner: for every affordable (card, reachable cell) it recomputes the exact
    // multiplicative adjacency engine and projects the margin over the tide 15 s and 40 s ahead;
    // it also values "wait" and "reroll". It walks the cursor to the chosen cell with `next`,
    // and before buying it verifies the purchase with a snapshot/restore lookahead (swells and
    // rogue waves included), skipping buys that would sink it.
    smart: {
      decisionMs: 200,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over) return 'none';
        const T = s.types, P = s.tideParams;
        function multAt(g, i) {
          const r = (i / 5) | 0, c = i % 5; let m = 1;
          const N = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const d of N) { const rr = r + d[0], cc = c + d[1]; if (rr < 0 || rr > 4 || cc < 0 || cc > 4) continue; const n = g[rr * 5 + cc]; if (!n) continue; if (n.t === T.MILL) m *= n.k; else if (n.t === T.FURN) m *= 0.5; }
          let lr = 1, lc = 1;
          for (let k = 0; k < 5; k++) { const a = g[r * 5 + k], b = g[k * 5 + c]; if (k !== c && a && a.t === T.LENS && a.o === 0 && a.k > lr) lr = a.k; if (k !== r && b && b.t === T.LENS && b.o === 1 && b.k > lc) lc = b.k; }
          return m * lr * lc;
        }
        function engine(g) {
          let F = 0, B = 0;
          for (let i = 0; i < 25; i++) { const n = g[i]; if (!n || n.t === T.MILL || n.t === T.LENS) continue; const v = n.v * multAt(g, i); if (n.t === T.BANK) B += v; else F += v; }
          return { F, B };
        }
        const t0 = s.t / 1000;
        const lnT = t => Math.log(P.T0) + P.R0 * P.TAU * (Math.exp(t / P.TAU) - 1);
        // wealth ODE: dW/dt = F + B * min(W, VAULT * tide)   (numeric, 0.25 s steps)
        function project(W0, F, B, hs) {
          const out = []; let W = W0, h = 0, k = 0; const dt = 0.25;
          while (k < hs.length) {
            const cap = P.VAULT * Math.exp(lnT(t0 + h));
            W += (F + B * Math.min(W, cap)) * dt; h += dt;
            while (k < hs.length && h >= hs[k] - 1e-9) { out.push(W); k++; }
          }
          return out;
        }
        const HV = [15, 40];
        function value(W0, F, B) {
          const ws = project(W0, F, B, HV);
          return 0.5 * (Math.log(Math.max(1e-300, ws[0])) - lnT(t0 + 15)) + 0.5 * (Math.log(Math.max(1e-300, ws[1])) - lnT(t0 + 40));
        }
        const HS = []; for (let h = 0.25; h <= 8; h += 0.25) HS.push(h);
        function safe(W0, F, B) {    // pessimistic: crest of the swell (+ a warned rogue wave) over the next 8 s
          const A = 0.04 + 0.06 * Math.min(1, t0 / 150), ws = project(W0, F, B, HS);
          for (let k = 0; k < HS.length; k++) {
            const h = HS[k]; let amp = A;
            if (s.rogue && s.rogue.warned) { const ta = s.rogue.at / 1000, td = s.rogue.dur / 1000; if (t0 + h >= ta && t0 + h <= ta + td) amp += s.rogue.amp; }
            if (Math.log(Math.max(1e-300, ws[k])) < lnT(t0 + h) + Math.log(1 + amp) + 0.02) return false;
          }
          return true;
        }
        const grid = s.grid.map(n => n ? { t: n.t, v: n.v, o: n.o, k: n.k } : null);
        const full = grid.every(n => n);
        const base = value(s.wealth, s.income, s.interest);
        let best = { v: base, kind: 'wait' };
        s.shop.forEach((c, k) => {
          if (!c.afford) return;
          const W1 = s.wealth - c.price;
          for (let i = 0; i < 25; i++) {
            if (grid[i] && !full) continue;              // `next` only reaches empty cells until the grid is full
            const g = grid.slice();
            g[i] = { t: c.t, v: c.t === T.BANK ? c.k : (c.t === T.SEED || c.t === T.FURN) ? c.k * s.tideBase : 0, o: c.o, k: c.k };
            const e = engine(g);
            if (!safe(W1, e.F, e.B)) continue;
            let v = value(W1, e.F, e.B);
            let d = 0; if (i !== s.cursor) { let p = s.cursor; while (p !== i && d < 25) { let q = p; for (let kk = 1; kk <= 25; kk++) { const j = (p + kk) % 25; if (!grid[j] || full) { q = j; break; } } p = q; d++; } }
            v -= d * 0.004;                                // walking the cursor costs time
            if (v > best.v + 1e-9) best = { v, kind: 'buy', slot: k, cell: i };
          }
        });
        // reroll if nothing in the shop is worth buying and we have room to spare
        if (best.kind === 'wait' && s.margin > 2.2 && s.shop.some(c => c.afford || true)) {
          const rc = s.rerollCost;
          if (rc / s.tide < 0.25 && (s.wealth - rc) / s.tide > 1.9 && G.getActions().includes('reroll')) {
            const anyGood = s.shop.some(c => c.afford);
            if (!anyGood || mem.waitN > 10) { mem.waitN = 0; return 'reroll'; }
          }
        }
        if (best.kind === 'wait') { mem.waitN = (mem.waitN || 0) + 1; return 'none'; }
        mem.waitN = 0;
        if (best.cell !== s.cursor) return 'next';
        // verify with an exact lookahead (real swell + any rogue wave) before committing
        const a = 'buy' + (best.slot + 1);
        if (!G.getActions().includes(a)) return 'none';
        const snap = G.snapshot();
        G.quiet(true);
        G.input(a);
        let ok = true;
        for (let k = 0; k < 24 && ok; k++) { G.tick(250); const st = G.getState(); if (st.over || st.under > 0) ok = false; }
        G.restore(snap);
        G.quiet(false);
        return ok ? a : 'none';
      },
    },
  },
};
