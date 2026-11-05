// Bots for games/spellsnake.html. decide() functions are stringified and run inside the page.
// The game exposes read-only dictionary helpers on G: isWord(w), isPrefix(p), wordValue(w).
module.exports = {
  bots: {
    random: {
      decisionMs: 100,
      decide: function (G, rng, mem) {
        const a = G.getActions();
        return a[Math.floor(rng() * a.length)];
      },
    },

    // Rule of thumb: cast any valid word at once; otherwise head for the nearest letter that keeps a live
    // prefix at the head end; never step straight into a wall/rock/body; spit if the body is all junk.
    heuristic: {
      decisionMs: 50,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over) return 'none';
        if (s.word && s.word.length >= 3) return 'cast';
        if (s.turnQ.length) return 'none';
        const C = s.cols, R = s.rows, h = s.head;
        const blocked = (x, y) => {
          if (x < 0 || y < 0 || x >= C || y >= R || s.rocks[y * C + x]) return true;
          for (let i = 1; i < s.body.length - 1; i++) if (s.body[i][0] === x && s.body[i][1] === y) return true;
          return false;
        };
        const str = s.lets.split('').reverse().join('');
        let best = null, bv = -1e9;
        for (const t of s.tiles) {
          const ns = str + t.c;
          let v = -5;
          for (let k = Math.min(8, ns.length); k >= 1; k--) {
            const suf = ns.slice(ns.length - k);
            if (k >= 3 && G.isWord(suf)) { v = 100 + k * 10; break; }
            if (G.isPrefix(suf)) { v = k * 10; break; }
          }
          v -= (Math.abs(t.x - h[0]) + Math.abs(t.y - h[1])) * 3;
          if (v > bv) { bv = v; best = t; }
        }
        if (s.lets.length >= 7 && bv < -20) return 'cast';
        const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], NAMES = ['up', 'right', 'down', 'left'];
        let choice = -1, cvv = -1e9;
        for (let d = 0; d < 4; d++) {
          if (d === (s.dir + 2) % 4) continue;
          const nx = h[0] + DX[d], ny = h[1] + DY[d];
          if (blocked(nx, ny)) continue;
          let v = 0;
          if (best) v -= Math.abs(best.x - nx) + Math.abs(best.y - ny);
          let free = 0; for (let e = 0; e < 4; e++) if (!blocked(nx + DX[e], ny + DY[e])) free++;
          v += free * 0.6;
          if (d === s.dir) v += 0.2;
          if (v > cvv) { cvv = v; choice = d; }
        }
        if (choice < 0 || choice === s.dir) return 'none';
        return NAMES[choice];
      },
    },

    // Search bot: a DFS word planner over the board tiles (up to 4 letters ahead, using the dictionary
    // helpers) chooses which letter to fetch and whether to cast now or extend; a timed BFS (knows when tail
    // cells free up and when warned cells turn to rock) routes there without eating junk; flood-fill space
    // checks plus a 2-move snapshot lookahead (G.snapshot / G.quiet / G.restore) veto traps.
    smart: {
      decisionMs: 50,
      decide: function (G, rng, mem) {
        const s = G.getState();
        if (s.over) return 'none';
        if (s.turnQ.length) return 'none';
        const C = s.cols, R = s.rows, N = C * R, h = s.head, L = s.body.length, iv = s.interval;
        const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], NAMES = ['up', 'right', 'down', 'left'];
        const str = s.lets.split('').reverse().join('');      // tail -> head
        const streakM = 1 + 0.25 * s.streak;
        const urgency = Math.min(1.5, s.since / s.hungerAt);       // >= 1 means the tail is already growing
        // ---- occupancy timing (in moves from now) ----
        const freeAt = new Int16Array(N), rockAt = new Int16Array(N).fill(30000), tileAt = new Int16Array(N).fill(-1);
        for (let i = 0; i < N; i++) if (s.rocks[i]) rockAt[i] = 0;
        const toMove = Math.max(0, iv - s.moveT);
        for (const w of s.warns) { const c = w.y * C + w.x; rockAt[c] = Math.min(rockAt[c], Math.max(1, Math.floor((w.t - toMove) / iv) + 1)); }
        for (let i = 0; i < L; i++) { const b = s.body[i], c = b[1] * C + b[0]; freeAt[c] = Math.max(freeAt[c], L - i + (s.grow || 0)); }
        s.tiles.forEach((t, k) => { tileAt[t.y * C + t.x] = k; });
        const ok = (c, step) => step >= freeAt[c] && step < rockAt[c];
        // timed BFS; tiles other than `target` are terminal (reachable, but never walked through) when `term`
        function bfs(sx, sy, sdir, step0, term, target) {
          const dist = new Int16Array(N).fill(-1), first = new Int8Array(N).fill(-1), q = [];
          for (let d = 0; d < 4; d++) {
            if (sdir >= 0 && d === (sdir + 2) % 4) continue;
            const nx = sx + DX[d], ny = sy + DY[d];
            if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
            const c = ny * C + nx;
            if (!ok(c, step0 + 1)) continue;
            dist[c] = 1; first[c] = d;
            if (!(term && tileAt[c] >= 0)) q.push(c);
          }
          let count = 0;
          for (let qi = 0; qi < q.length; qi++) {
            const c = q[qi], x = c % C, y = (c / C) | 0, dd = dist[c]; count++;
            for (let d = 0; d < 4; d++) {
              const nx = x + DX[d], ny = y + DY[d];
              if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
              const n = ny * C + nx;
              if (dist[n] >= 0 || !ok(n, step0 + dd + 1)) continue;
              dist[n] = dd + 1; first[n] = first[c];
              if (!(term && tileAt[n] >= 0 && tileAt[n] !== target)) q.push(n);
              else if (tileAt[n] === target) { /* reached */ }
            }
          }
          return { dist, first, count };
        }
        function U(w) { if (!w) return 0; let v = G.wordValue(w) * streakM; if (w.length >= 5) v += 140 * (w.length - 4); return v; }

        // ---- word plan (cached until letters / tiles change) ----
        const key = s.lets + '|' + s.tiles.map(t => t.c + t.x + ',' + t.y).join(';') + '|' + Math.floor(urgency * 4);
        if (mem.key !== key) {
          mem.key = key;
          const H0 = bfs(h[0], h[1], s.dir, 0, true, -1);
          const T = s.tiles, nT = T.length, base = str.slice(-7);
          const alive0 = [];
          for (let p = 0; p < base.length; p++) if (G.isPrefix(base.slice(p))) alive0.push(p);
          let bestPlan = null;
          const dfs = (ns, alive, used, cost, lx, ly, depth, fk) => {
            for (let k = 0; k < nT; k++) {
              if (used & (1 << k)) continue;
              const t = T[k];
              let c;
              if (depth === 0) { c = H0.dist[t.y * C + t.x]; if (c < 0) continue; }
              else c = cost + (Math.abs(t.x - lx) + Math.abs(t.y - ly)) * 1.25 + 1;
              const ns2 = ns + t.c, alive2 = [];
              let word = '';
              const starts = alive.concat([ns.length]);
              for (const p of starts) {
                const suf = ns2.slice(p);
                if (suf.length > 8) continue;
                if (suf.length >= 3 && suf.length > word.length && G.isWord(suf)) word = suf;
                if (suf.length < 8 && G.isPrefix(suf)) alive2.push(p);
              }
              const f = depth === 0 ? k : fk;
              if (word) {
                const v = U(word) / Math.pow(c + 4, 1 + urgency);
                if (!bestPlan || v > bestPlan.v) bestPlan = { v, k: f, word, depth, cost: c };
              }
              if (depth < 3 && alive2.length) dfs(ns2, alive2, used | (1 << k), c, t.x, t.y, depth + 1, f);
            }
          };
          dfs(base, alive0, 0, 0, h[0], h[1], 0, -1);
          let fallback = -1, fv = -1e9;
          for (let k = 0; k < nT; k++) {
            const t = T[k], d = H0.dist[t.y * C + t.x]; if (d < 0) continue;
            const ns = base + t.c; let al = 0;
            for (let p = 0; p < ns.length; p++) if (G.isPrefix(ns.slice(p))) { al = ns.length - p; break; }
            const v = al * 3 + ('AEIOU'.includes(t.c) ? 2 : 0) - d * 0.5;
            if (v > fv) { fv = v; fallback = k; }
          }
          mem.plan = bestPlan; mem.fallback = fallback;
        }
        const plan = mem.plan;
        let want = 'move';
        if (s.word) {
          const now = U(s.word);
          if (urgency > 0.75 || !(plan && plan.word.length > s.word.length && U(plan.word) > now * 1.6 && plan.depth <= 1 && plan.cost <= 10)) want = 'cast';
        }
        let tk = plan ? plan.k : mem.fallback;
        if (want === 'cast') tk = mem.fallback >= 0 ? mem.fallback : tk;
        const tgt = tk != null && tk >= 0 ? s.tiles[tk] : null;
        const tcell = tgt ? tgt.y * C + tgt.x : -1;
        const HB = bfs(h[0], h[1], s.dir, 0, true, tk == null ? -1 : tk);

        // ---- choose a direction ----
        const cands = [];
        for (let d = 0; d < 4; d++) {
          if (d === (s.dir + 2) % 4) continue;
          const nx = h[0] + DX[d], ny = h[1] + DY[d];
          if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
          const c = ny * C + nx;
          if (!ok(c, 1)) continue;
          const sp = bfs(nx, ny, d, 1, false, -1).count + 1;
          const junk = tileAt[c] >= 0 && c !== tcell;
          cands.push({ d, sp, junk, toT: tcell >= 0 && HB.dist[tcell] >= 0 ? (HB.first[tcell] === d ? 0 : 1) : 0 });
        }
        if (!cands.length) return s.lets.length ? 'cast' : 'none';
        const need = Math.min(L + 4, 60);
        cands.sort((a, b) => {
          const sa = a.sp >= need ? 1 : 0, sb = b.sp >= need ? 1 : 0;
          if (sa !== sb) return sb - sa;
          if (!sa && a.sp !== b.sp) return b.sp - a.sp;
          if (a.toT !== b.toT) return a.toT - b.toT;
          if (a.junk !== b.junk) return a.junk ? 1 : -1;
          return (b.d === s.dir ? 1 : 0) - (a.d === s.dir ? 1 : 0);
        });
        // tight spot: verify the pick with a 2-move lookahead on the real sim
        let pick = cands[0];
        if (pick.sp < L + 12 && cands.length > 1) {
          const snap = G.snapshot(); G.quiet(true);
          for (const cd of cands) {
            G.restore(snap);
            if (cd.d !== s.dir) G.input(NAMES[cd.d]);
            G.tick(iv + 1);
            let alive = !G.isOver();
            if (alive) {
              const s1 = G.getState(), snap1 = G.snapshot();
              alive = false;
              for (let d2 = 0; d2 < 4 && !alive; d2++) {
                if (d2 === (s1.dir + 2) % 4) continue;
                G.restore(snap1);
                if (d2 !== s1.dir) G.input(NAMES[d2]);
                G.tick(iv + 1);
                if (!G.isOver()) alive = true;
              }
            }
            if (alive) { pick = cd; break; }
          }
          G.restore(snap); G.quiet(false);
        }
        if (pick.d !== s.dir) return NAMES[pick.d];
        if (want === 'cast') return 'cast';
        if (pick.sp < L && s.lets.length) return 'cast';     // trapped: shrink
        return 'none';
      },
    },
  },
};
