// Bots for games/magsumo.html (they drive P1 in the solo CPU gauntlet).
// Actions: none, up, down, left, right (held steering), flip (one-shot polarity flip; keeps the held steering).
module.exports = {
  bots: {
    random: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb: stay off the edge, get between the opponent and the centre, slam when point-blank and
    // on the inside, and switch to attract when you are the outer puck (so you don't get repelled off).
    heuristic: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over || s.phase !== 'fight') return 'none';
        const m = s.me, f = s.foe, c = s.center;
        const la = 0.3, mx = m.x + m.vx * la, my = m.y + m.vy * la, fx = f.x + f.vx * la, fy = f.y + f.vy * la;
        const rm = Math.hypot(mx - c.x, my - c.y), rf = Math.hypot(fx - c.x, fy - c.y) || 1;
        const d = Math.hypot(f.x - m.x, f.y - m.y);
        const meIn = Math.hypot(m.x - c.x, m.y - c.y) < Math.hypot(f.x - c.x, f.y - c.y) - 6;
        if (m.cd <= 0) {
          if (s.attract && d < s.slamRange && meIn) return 'flip';
          if (!s.attract && !meIn && d < 150) return 'flip';
        }
        let tx, ty;
        if (rm > s.ringR - 60) { tx = c.x; ty = c.y; }
        else { const back = Math.min(60, rf * 0.8); tx = c.x + (fx - c.x) / rf * (rf - back); ty = c.y + (fy - c.y) / rf * (rf - back); }
        const dx = tx - mx, dy = ty - my;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return 'none';
        return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      },
    },

    // Lookahead: each action now, then (a) the heuristic policy as a rollout for 0.8 s and (b) each held
    // direction for 0.5 s, all via snapshot/restore. Losing the round is -inf, winning +inf; otherwise
    // own edge margin vs the opponent's edge margin (plus score gained).
    smart: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over || s.phase !== 'fight') return 'none';
        function policy(st) {
          const m = st.me, f = st.foe, c = st.center;
          const la = 0.3, mx = m.x + m.vx * la, my = m.y + m.vy * la, fx = f.x + f.vx * la, fy = f.y + f.vy * la;
          const rm = Math.hypot(mx - c.x, my - c.y), rf = Math.hypot(fx - c.x, fy - c.y) || 1;
          const d = Math.hypot(f.x - m.x, f.y - m.y);
          const meIn = Math.hypot(m.x - c.x, m.y - c.y) < Math.hypot(f.x - c.x, f.y - c.y) - 6;
          if (m.cd <= 0) {
            if (st.attract && d < st.slamRange && meIn) return 'flip';
            if (!st.attract && !meIn && d < 150) return 'flip';
          }
          let tx, ty;
          if (rm > st.ringR - 60) { tx = c.x; ty = c.y; }
          else { const back = Math.min(60, rf * 0.8); tx = c.x + (fx - c.x) / rf * (rf - back); ty = c.y + (fy - c.y) / rf * (rf - back); }
          const dx = tx - mx, dy = ty - my;
          return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        }
        const acts = G.getActions();
        const snap = G.snapshot();
        G.quiet(true);
        const h0 = s.hearts, w0 = s.wins, sc0 = s.score;
        function value(st) {
          if (st.hearts < h0) return -1e6;
          if (st.wins > w0) return 1e6 + (st.score - sc0);
          const m = st.me, f = st.foe, c = st.center, R = st.ringR;
          const rm = Math.hypot(m.x - c.x, m.y - c.y) || 1, rf = Math.hypot(f.x - c.x, f.y - c.y) || 1;
          const mm = R - rm, mf = R - rf;
          const vout = ((m.x - c.x) * m.vx + (m.y - c.y) * m.vy) / rm;
          const fout = ((f.x - c.x) * f.vx + (f.y - c.y) * f.vy) / rf;
          let v = (st.score - sc0) * 4;
          v -= 4000 * Math.pow(Math.max(0, 1 - mm / 90), 2);
          v -= Math.max(0, vout) * Math.max(0, 1 - mm / 160) * 8;
          v += 2500 * Math.pow(Math.max(0, 1 - mf / 110), 2);
          v += Math.max(0, fout) * Math.max(0, 1 - mf / 170) * 5;
          v -= rm * 2;
          if (m.teeter > 0) v -= 2500;
          if (f.teeter > 0) v += 1500;
          return v;
        }
        let bestA = 'none', bestV = -Infinity;
        for (const a of acts) {
          let av = -Infinity;
          // (a) heuristic rollout
          G.restore(snap); G.input(a); G.tick(100);
          let worst = value(G.getState());
          for (let k = 0; k < 8 && worst > -5e5; k++) {
            const st = G.getState(); if (st.phase !== 'fight') break;
            G.input(policy(st)); G.tick(100);
            const v = value(G.getState()); if (v < -5e5 || v > 5e5) { worst = v; break; } worst = v;
          }
          av = Math.max(av, worst);
          // (b) held directions
          for (const b of ['none', 'up', 'down', 'left', 'right']) {
            G.restore(snap); G.input(a); G.tick(100);
            const mid = value(G.getState());
            if (mid < -5e5) { av = Math.max(av, mid); continue; }
            G.input(b); G.tick(500);
            av = Math.max(av, value(G.getState()));
          }
          if (av > bestV) { bestV = av; bestA = a; }
        }
        G.restore(snap);
        G.quiet(false);
        return bestA;
      },
    },
  },
};
