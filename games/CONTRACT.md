# Game Contract (every game in `games/` must follow this)

The working reference is **`games/_example.html`**, with its bots in `lab/bots/_example.js`. Copy its boilerplate.

## File
- Each game is one self-contained file, `games/<id>.html`. Use vanilla JS and `<canvas>`. No CDNs, no external assets, no fetch.
- Fill in `<title>` with the game name and `<meta name="description">` with a one-line pitch.
- The canvas is scaled to fit the window with letterboxing, and `devicePixelRatio` is handled. The game is usable from 360 px wide (phone) up to desktop.
- Sound is synthesised with WebAudio. Create the `AudioContext` lazily on the first keydown or pointerdown. **Wrap every audio call in try/catch.** The game must work silently.

## Player experience (non-negotiable)
- **Playable within 5 seconds.** Load the page and the game is running, or one key or tap starts it. There is no menu and no tutorial wall. Show a one-line controls hint on the first screen; it may fade after the first input.
- The score is visible at all times, and the best score is shown too. Store the best score in `localStorage` under the key `funlab.<id>.best`, wrapping both get and set in try/catch.
- Difficulty escalates during a run. There is a **hard ceiling**: even perfect play must eventually lose (target: a strong player lasts 1–5 minutes; a very strong bot should not last past about 8). No bot may survive the lab's 15-minute game-time cap.
- **Game over** shows the score, the best score and **the cause** ("hit by your 3rd ghost", "debt caught you"). Any key or tap restarts, after a 400 ms lockout.
- **Keyboard and touch** both work. Use on-screen touch zones or swipe/tap mappings, and show them when touch is detected.
- **Juice:** screenshake, particles, hitstop (a few frames of freeze on big hits), easing/tweens, floating score text, flashes and satisfying synth sounds. Every major event should use at least 3 of these feedback channels.
- Include at least one forgiveness mechanic, such as input buffering, coyote time, a hitbox smaller than the sprite, or an assist.
- Include at least one **risk/reward** mechanic and at least one **multiplier/combo** that compounds.

## Determinism and architecture (this is what makes the lab possible)
- Keep **all simulation state in one plain JSON-serialisable object** (call it `S`). That includes the RNG state, stored as an integer (`S.rng`). No class instances, Maps, Sets or functions inside `S`.
- Use the seeded RNG (mulberry32 over `S.rng`, see the example) for **everything in the sim**. **Never** use `Math.random`, `Date.now`, or `performance.now` in sim logic.
- Run the simulation on a **fixed step** (`STEP = 1000/60` ms). `step()` advances `S` by one step. `tick(ms)` runs `floor((carry+ms)/STEP)` steps and keeps the remainder as carry.
- Cosmetic effects (particles, shake, flash, floating text) live **outside** `S`, in a separate `FX` object. They may use `Math.random`. They are **advanced inside `step()`** (so stepped-mode screenshots show them), and sim logic never reads them.
- Hitstop can be part of `S` (for example, `S.freeze` ms during which `step` does nothing to the world). That keeps it deterministic.
- Two modes:
  - **Real-time (human):** a `requestAnimationFrame` loop accumulates real time and calls `step()` at a fixed rate, then `render()`.
  - **Manual (bots/lab):** once `__game.reset(seed)` is called, set `manual = true`. From then on the rAF loop **only renders**, and time advances only through `__game.tick(ms)`. Keyboard and touch events still feed input in manual mode, which lets the play tool step time while sending real key presses.

## `window.__game` API (all required)
```
reset(seed)       // start a fresh run with integer seed; enter manual mode; playing immediately (no menu)
getState()        // plain object: { t, score, over, cause, difficulty, ...game-specific fields bots need } (JSON-safe)
                  // difficulty = a number that rises as the run escalates (level, speed, BPM...)
getActions()      // array of action strings valid right now; ALWAYS includes 'none'; at most 6 entries
input(action)     // apply action. Held-style actions (e.g. 'left') persist until another input; 'none' releases.
                  // One-shot actions (e.g. 'fire', 'rotate') trigger once on the next step.
tick(ms)          // advance sim by ms (fixed steps). Must not render.
isOver()          // boolean
score()           // number (integer)
snapshot()        // returns deep copy of S (+ carry + any pending input) — e.g. structuredClone
restore(snap)     // restores exactly; after restore, same inputs+ticks ⇒ identical results
quiet(bool)       // when true, sim events spawn NO FX and NO sounds (bot lookahead)
render()          // draw current state now (used before screenshots)
```
- `input()` with an action that is not in `getActions()` should be ignored, not throw.
- Same seed + same input sequence + same tick sequence ⇒ identical `getState()`. The lab checks this.
- `getState().cause` is a short human-readable string once `over` is true. Otherwise it is `null`.
- Expose enough in `getState()` for a heuristic bot (positions, threats, grid…). Smart bots may also use `snapshot`/`restore` lookahead.
- Human restarts should call the same internal reset with a fresh seed (for example, `Date.now() & 0x7fffffff`, which is fine **outside** the sim).

## Bots: `lab/bots/<id>.js`
```js
module.exports = {
  bots: {
    random:    { decisionMs: 100, decide: function (G, rng, mem) { const a = G.getActions(); return a[Math.floor(rng() * a.length)]; } },
    heuristic: { decisionMs: 100, decide: function (G, rng, mem) { /* rule of thumb from getState() */ } },
    smart:     { decisionMs: 100, decide: function (G, rng, mem) { /* lookahead via G.snapshot/restore + G.quiet */ } },
  }
};
```
- `decide` functions are **stringified and run inside the page**. They must be self-contained: no references to Node scope. Put helpers inside the function body, or use `mem` to cache them.
- `rng` is a seeded `[0,1)` RNG for the bot. `mem` is a per-session scratch object.
- The runner loop is: `a = decide(G, rng, mem); if (a != null) G.input(a); G.tick(decisionMs);` until `isOver()` or the 15-minute cap.
- A smart bot must leave the game exactly as it found it after lookahead: `const s = G.snapshot(); G.quiet(true); …try futures…; G.restore(s); G.quiet(false);`.
- Budget: a smart-bot session should take **under ~20 s of wall time** for a typical session. Keep the lookahead horizon and branching modest.
- The smart bot should be clearly better than the heuristic bot, which should be better than random. But the game must stay unsolved: if the smart bot can survive forever, make the game's ceiling harder, not the bot dumber.

## Self-test before you call a game done
```
node lab/check.js <id>           # API conformance, determinism, console errors, real-time + touch smoke test
node lab/run.js <id> --n 5       # quick bot run (the full lab uses --n 50)
node lab/shoot.js <id>           # screenshots into lab/shots/<id>/  — LOOK at them
```
