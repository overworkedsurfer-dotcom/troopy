// Bots for games/compound.html. decide() functions are stringified and run inside the page.
// Action semantics: buyN selects card N (the cursor jumps to its ★ best cell, if one stands out); buyN again builds it on the cursor (a filled cursor cell needs one more buyN to
// confirm the replace); next moves the cursor to the next EMPTY cell (every cell once the board is full); reroll.
module.exports = {
  bots: {
    random: {
      decisionMs: 200,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb: walk the cursor to an empty cell, then pick and build the cheapest card that keeps a 1.6x margin
    // over the tide. No adjacency planning of its own (it builds where the cursor lands: the game's ★ best cell when one stands out), never rerolls.
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
        return 'buy' + (bk + 1);
      },
    },

    // Model-based planner: for every affordable (card, reachable cell) it recomputes the exact multiplicative adjacency
    // engine and projects the score it would earn (10 x margin per second) over the next 45 s plus the long-run growth;
    // it values "wait" and "reroll" too. It selects the card, walks the cursor there with `next`, and before building it
    // verifies the purchase with a snapshot/restore lookahead (swells and rogue waves included).
    smart: {
      decisionMs: 200,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over) return 'none';
        const T = s.types, P = s.tideParams, GN = P.GN, NC = GN * GN;
        function multAt(g, i) {
          const r = (i / GN) | 0, c = i % GN; let m = 1;
          const N = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const d of N) { const rr = r + d[0], cc = c + d[1]; if (rr < 0 || rr >= GN || cc < 0 || cc >= GN) continue; const n = g[rr * GN + cc]; if (!n) continue; if (n.t === T.MILL) m *= n.k; else if (n.t === T.FURN) m *= 0.5; }
          let lr = 1, lc = 1;
          for (let k = 0; k < GN; k++) { const a = g[r * GN + k], b = g[k * GN + c]; if (k !== c && a && a.t === T.LENS && a.o === 0 && a.k > lr) lr = a.k; if (k !== r && b && b.t === T.LENS && b.o === 1 && b.k > lc) lc = b.k; }
          return m * lr * lc;
        }
        function engine(g) {
          let F = 0, B = 0;
          for (let i = 0; i < NC; i++) { const n = g[i]; if (!n || n.t === T.MILL || n.t === T.LENS) continue; const v = n.v * multAt(g, i); if (n.t === T.BANK) B += v; else F += v; }
          return { F, B };
        }
        const t0 = s.t / 1000;
        const lnT = t => Math.log(P.T0) + P.R0 * P.TAU * (Math.exp(t / P.TAU) - 1);
        // dW/dt = F + B*min(W, VAULT*tide); score accrues PTS*min(margin, VAULT) per second
        // the true objective: score earned until the projected drowning (no score after it), over a 90 s horizon
        function value(W0, F, B) {
          let W = W0, pts = 0; const dt = 0.5;
          for (let h = dt; h <= 90 + 1e-9; h += dt) {
            const Tb = Math.exp(lnT(t0 + h));
            W += (F + B * Math.min(W, P.VAULT * Tb)) * dt;
            const m = W / Tb;
            if (m < 1.08) return pts - (90 - h) * 5;
            pts += P.PTS * Math.min(m, P.VAULT) * dt;
          }
          return pts;
        }
        function safe(W0, F, B) {                 // pessimistic: crest of the swell (+ a warned rogue wave) over the next 8 s
          const A = 0.04 + 0.06 * Math.min(1, t0 / 150); let W = W0;
          for (let h = 0.25; h <= 8; h += 0.25) {
            const Tb = Math.exp(lnT(t0 + h)); W += (F + B * Math.min(W, P.VAULT * Tb)) * 0.25;
            let amp = A;
            if (s.rogue) { const ta = s.rogue.at / 1000, td = s.rogue.dur / 1000; if (t0 + h >= ta && t0 + h <= ta + td) amp += s.rogue.amp; }
            if (W < Tb * (1 + amp) * 1.03) return false;
          }
          return true;
        }
        const grid = s.grid.map(n => n ? { t: n.t, v: n.v, o: n.o, k: n.k } : null);
        const full = grid.every(n => n);
        let best = { v: value(s.wealth, s.income, s.interest), kind: 'wait' };
        s.shop.forEach((c, k) => {
          if (!c.afford) return;
          const W1 = s.wealth - c.price;
          for (let i = 0; i < NC; i++) {
            if (grid[i] && !full) continue;          // `next` only reaches empty cells until the board is full
            const g = grid.slice();
            g[i] = { t: c.t, v: c.t === T.BANK ? c.k : (c.t === T.SEED || c.t === T.FURN) ? c.k * s.tideBase : 0, o: c.o, k: c.k };
            const e = engine(g);
            if (!safe(W1, e.F, e.B)) continue;
            let v = value(W1, e.F, e.B);
            let d = 0, p = s.cursor; while (p !== i && d < NC) { let q = p; for (let kk = 1; kk <= NC; kk++) { const j = (p + kk) % NC; if (!grid[j] || full) { q = j; break; } } p = q; d++; }
            v -= d * 2 + (s.sel === k ? 0 : 1);       // walking the cursor costs time
            if (v > best.v + 1e-6) best = { v, kind: 'buy', slot: k, cell: i };
          }
        });
        if (best.kind === 'wait') {
          mem.waitN = (mem.waitN || 0) + 1;
          const rc = s.rerollCost;
          if (s.margin > 2.2 && rc / s.tide < 0.25 && (s.wealth - rc) / s.tide > 1.9 && mem.waitN > 8 && G.getActions().includes('reroll')) { mem.waitN = 0; return 'reroll'; }
          return 'none';
        }
        mem.waitN = 0;
        const a = 'buy' + (best.slot + 1);
        if (s.sel !== best.slot) return a;                        // select the card
        if (best.cell !== s.cursor) return 'next';                 // walk there
        if (grid[best.cell] && s.arm !== best.cell) return a;      // arm the replace (board full)
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
