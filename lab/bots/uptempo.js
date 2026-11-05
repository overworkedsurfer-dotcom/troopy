// Bots for games/uptempo.html. decide() functions are stringified and run inside the page.
// All bots decide every frame (decisionMs = one 60 Hz step): rhythm timing is a per-frame decision.
module.exports = {
  bots: {
    random: {
      decisionMs: 1000 / 60,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb: press a lane as soon as its next note is inside ~70% of the PERFECT window
    // (most urgent lane first). Never brakes unless HP is about to run out.
    heuristic: {
      decisionMs: 1000 / 60,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over) return 'none';
        if (s.canBrake && s.hp < 30) return 'brake';
        if (s.freeze > 0) return 'none';
        const st = s.step, seen = [0, 0, 0, 0];
        let best = null, bestE = -1e9;
        for (const n of s.notes) {
          if (seen[n.l]) continue;
          const e = st - n.dt;                       // timing error if pressed on the next step (+late)
          if (e > s.win.late) continue;
          seen[n.l] = 1;
          if (s.locks[n.l] > st + 1e-6) continue;
          if (e >= -s.win.perfect * 0.7 && e > bestE) { bestE = e; best = n.l; }
        }
        return best == null ? 'none' : 'l' + best;
      },
    },

    // Frame-optimal timing, chord spreading, jacks started as early as the window allows,
    // all verified by a short snapshot/restore lookahead whenever lanes contend.
    // Tempo management: near the jack wall it "feathers" (hits GOOD on purpose so the BPM holds
    // and the combo survives), brakes for free right after a combo break, and brakes when hurt.
    smart: {
      decisionMs: 1000 / 60,
      decide: function (G, rng, mem) {
        const T = 192, H = 14;
        function pol(s, feather) {
          if (s.over) return 'none';
          const st = s.step, adv = s.freeze > 0 ? 0 : st;
          const first = [null, null, null, null], nextGap = [1e9, 1e9, 1e9, 1e9];
          for (const n of s.notes) {
            const e = adv - n.dt;
            if (e > s.win.late) continue;
            if (!first[n.l]) first[n.l] = { n, e };
            else if (nextGap[n.l] === 1e9) nextGap[n.l] = n.dt - first[n.l].n.dt;
          }
          const ready = [];
          for (let l = 0; l < 4; l++) {
            const f = first[l]; if (!f) continue;
            if (s.locks[l] > st + 1e-6) continue;
            if (f.e < -s.win.early + 1) continue;
            ready.push(l);
          }
          if (!ready.length) return 'none';
          let pick = null, pe = -1e9;
          for (const l of ready) {
            const f = first[l];
            let k = 0; for (const o of ready) if (o !== l && Math.abs(first[o].n.dt - f.n.dt) < st * 1.5) k++;
            let thr = -st / 2 - k * st / 2;                                     // chords: start early, roll across frames
            if (feather && k === 0) thr = s.win.perfect + 1.5;                   // aim just past PERFECT: a GOOD holds the BPM
            if (nextGap[l] < s.lockMs + st * 0.6 + 2) thr = -s.win.early + 1;  // jack: as early as allowed
            if (f.e >= thr && f.e > pe) { pe = f.e; pick = l; }
          }
          return pick == null ? 'none' : 'l' + pick;
        }
        const s = G.getState();
        if (s.over) return 'none';
        const st = s.step, adv = s.freeze > 0 ? 0 : st, over = s.bpm - s.floor;
        const feather = s.bpm >= T && s.hp > 40;
        const greedy = pol(s, feather);

        // strategic brake (only when nothing needs pressing this frame)
        if (greedy === 'none' && s.canBrake && s.freeze <= 0) {
          if (s.bpm >= 198 && over > 4) return 'brake';
          if (s.hp < 40 && over > 5 && s.level >= 4) return 'brake';
          if (s.combo < 3 && over > 6 && s.bpm > T - 8) return 'brake';
        }

        // contention test: more than one lane in play soon, or a jack coming in some lane?
        let soon = 0, jack = false;
        const cnt = [0, 0, 0, 0], fdt = [0, 0, 0, 0];
        for (const n of s.notes) {
          const e = adv - n.dt; if (e > s.win.late) continue;
          if (cnt[n.l] === 0) { fdt[n.l] = n.dt; if (e >= -s.win.early - st * 3) soon++; }
          else if (cnt[n.l] === 1 && n.dt - fdt[n.l] < s.lockMs + st && e >= -s.win.early - st * 8) jack = true;
          cnt[n.l]++;
        }
        if (soon <= 1 && !jack) return greedy;

        const cands = ['none'];
        for (let l = 0; l < 4; l++) if (s.locks[l] <= st + 1e-6) {
          for (const n of s.notes) if (n.l === l) { const e = adv - n.dt; if (e <= s.win.late && e >= -s.win.early) cands.push('l' + l); break; }
        }
        if (cands.length === 1) return 'none';
        const snap = G.snapshot();
        G.quiet(true);
        let bestA = greedy, bestV = -Infinity;
        const order = [greedy].concat(cands.filter(a => a !== greedy));
        const wP = feather ? 0.5 : 4, wG = 1;
        for (const a of order) {
          G.restore(snap);
          const s0 = G.getState();
          G.input(a); G.tick(st);
          for (let i = 1; i < H && !G.isOver(); i++) { G.input(pol(G.getState(), feather)); G.tick(st); }
          const s1 = G.getState();
          const v = (s1.over ? -1e6 : 0) - 100 * (s1.misses - s0.misses) - 60 * (s1.ghosts - s0.ghosts)
            + wP * (s1.perfects - s0.perfects) + wG * (s1.goods - s0.goods) + 0.001 * (s1.score - s0.score);
          if (v > bestV + 1e-9) { bestV = v; bestA = a; }
        }
        G.restore(snap);
        G.quiet(false);
        return bestA;
      },
    },
  },
};
