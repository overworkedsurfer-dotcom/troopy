// Bots for games/kickback.html. decide() functions are stringified and run inside the page.
module.exports = {
  bots: {
    random: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb: if drifting toward the rim, turn to face your velocity and fire to brake
    // (recoil pushes you back). Otherwise turn toward the nearest enemy (with lead) and fire
    // when lined up and the gun is not too hot.
    heuristic: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over) return 'none';
        const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
        const dx = s.x - s.cx, dy = s.y - s.cy, d = Math.hypot(dx, dy) || 1, gap = s.R - d - s.hitR;
        const nx = dx / d, ny = dy / d, vr = s.vx * nx + s.vy * ny, spd = Math.hypot(s.vx, s.vy);
        const ttr = vr > 0.05 ? gap / vr : 1e9;
        let target = null, fire = false;
        if (gap < 30 || ttr < 75) {
          // brake: aim along (velocity + outward normal) so recoil pushes inward
          const bx = (spd > 0.2 ? s.vx / spd : 0) + nx, by = (spd > 0.2 ? s.vy / spd : 0) + ny;
          target = Math.atan2(by, bx);
          fire = Math.abs(wrap(target - s.a)) < 0.6;
        } else {
          let best = null, bd = 1e9;
          for (const e of s.ents) { const dd = Math.hypot(e.x - s.x, e.y - s.y) - e.r; if (dd < bd) { bd = dd; best = e; } }
          if (best) {
            const tt = Math.max(0, bd) / s.bulV, tx = best.x + best.vx * tt, ty = best.y + best.vy * tt;
            target = Math.atan2(ty - s.y, tx - s.x);
            const rx = -Math.cos(target), ry = -Math.sin(target), recoilOut = rx * nx + ry * ny;
            fire = Math.abs(wrap(target - s.a)) < 0.22 && s.heat < 82 && !(recoilOut > 0.4 && gap < 100);
          } else if (d > 50) {
            target = Math.atan2(dy, dx);
            fire = spd < 1.2 && s.heat < 50 && Math.abs(wrap(target - s.a)) < 0.3;
          }
        }
        let rot = 0;
        if (target != null) { const da = wrap(target - s.a); if (da > 0.05) rot = 1; else if (da < -0.05) rot = -1; }
        if (rot < 0) return fire ? 'leftfire' : 'left';
        if (rot > 0) return fire ? 'rightfire' : 'right';
        return fire ? 'fire' : 'none';
      },
    },

    // Lookahead: for each action held 200 ms, try a few follow-ups for 500 ms and score the
    // resulting state (survival >> safety margins from rim/enemies/heat > score, kills, multiplier).
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
          if (gain > 0) v += 45 * Math.log(1 + gain / 25);
          v += (st.kills - s0.kills) * 70 + (st.hits - s0.hits) * 18;
          v += (st.mult - s0.mult) * 70;
          const dx = st.x - st.cx, dy = st.y - st.cy, d = Math.hypot(dx, dy) || 1, gap = st.R - d - st.hitR;
          const nx = dx / d, ny = dy / d, vr = st.vx * nx + st.vy * ny;
          if (gap < 10) v -= (10 - gap) * 30;
          if (st.rimT > 0) v -= 250;
          const ttr = vr > 0.02 ? gap / vr : 1e9;
          if (ttr < 80) v -= (80 - ttr) * 4;
          if (st.lock > 0) v -= 120 + st.lock * 0.15;
          else if (st.heat > 65) v -= (st.heat - 65) * 3;
          for (const e of st.ents) {
            const dd = Math.hypot(e.x - st.x, e.y - st.y) - e.r - st.hitR;
            if (dd < 90) v -= (90 - dd) * (90 - dd) * 0.045;
          }
          for (const b of st.ebul) {
            const dd = Math.hypot(b.x - st.x, b.y - st.y);
            if (dd < 60) v -= (60 - dd) * 5;
          }
          v -= Math.hypot(st.vx, st.vy) * 6 + d * 0.08;
          return v;
        }
        const FOLLOW = ['none', 'fire', 'leftfire', 'rightfire'];
        let bestA = 'none', bestV = -Infinity;
        for (const a of acts) {
          let va = -Infinity;
          for (const f of FOLLOW) {
            G.restore(snap);
            G.input(a); G.tick(200);
            let v;
            if (G.isOver()) v = -1e6;
            else {
              G.input(f); G.tick(250);
              if (G.isOver()) v = -5e5;
              else { G.tick(250); v = G.isOver() ? -2.5e5 : value(G.getState()); }
            }
            if (v > va) va = v;
          }
          if (a === mem.prev) va += 8;
          if (va > bestV) { bestV = va; bestA = a; }
        }
        G.restore(snap);
        G.quiet(false);
        mem.prev = bestA;
        return bestA;
      },
    },
  },
};
