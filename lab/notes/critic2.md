# Critic 2: blind play notes

Second blind critic. I did not read any game code, briefs, decisions or the earlier critic's notes. Everything below comes from what was on screen, plus `/status` (score, over, cause).
Setup: `lab/play.js` stepped-time server on port 8844, at most 15 screenshots per game. Stepped time makes twitch games harder for me than for a human at a keyboard, and I note where that matters. I could not hear audio, so sound is not scored.

---

## 1. junkorbit

**What it is (as I understood it):** a launcher sits at the bottom of a ring around a planet. Arrow keys aim and Space fires a comet that bends around the planet's gravity, following a dotted preview arc. A comet that hits a star scores, builds a streak multiplier and becomes a SAFE satellite that pays out on every pass (up to 12). A comet that misses stays in orbit as numbered LOOSE debris that eventually swings back at you. Shooting debris SAVEs it for +75. You have 3 hearts. Levels add a second gravity body (a moon).

| Run | Score | Length | Cause of game over | Mode |
|---|---|---|---|---|
| 1 (seed 201) | 3296 | ~48 s, reached level 3 | "comet #5 came back around (fired 0:38 ago)" | Deliberate for the first ~10 s: 4 aimed shots, 4 star hits, streak x2.5, score 1001. After that, to save screenshots, a scripted sweep of aim angles and fire every ~1.4 s. 4/30 comets hit a star, 7 loose shot down. |
| 2 (restart) | 4873 | ~39 s, level 2 | "comet #57 came back around (fired 0:06 ago)" | **Blind probe**: Space held, aim swept left/right, no looking. 7/66 comets hit a star, 23 loose shot down. |

**Did I improve?** My best score went up, but the improvement came from *mashing*, not from skill. The blind probe outscored my semi-deliberate run by 48%. When I aimed carefully I hit 4 of 4 stars, but that earned about 100 pts/s, while spamming earned about 125 pts/s, because each spammed miss becomes debris that the next spammed shot "saves" for +75. That is the most important thing I learned about this game.

| # | Principle | Score | Why |
|---|---|---|---|
| 1 | Readable in 5 s | 2 | "← → aim · SPACE fire (or mouse)" plus a two-line legend on the first frame, with no menu. The preview arc makes the first shot obvious. The legend is dense, though (three rules to read). |
| 2 | Clear goal, visible score | 2 | Score, best, streak, level bar, SAFE n/12 and LOOSE n are always visible. Goal: "curve comets into stars, and shoot down your misses before they come back." |
| 3 | Juicy feedback | 2 | Floating "+150", a "STREAK ×1.5!" banner, "SAFE ORBIT +50" and "SAVE #6 +75" text, burst particles, glowing trails, and a lock-on ring when the arc threads a star. |
| 4 | Forgiving input | 2 | The full trajectory preview plus a lock-on highlight is a strong aim assist. Neither death felt unfair: I fired those comets myself. |
| 5 | Fair, legible failure | 2 | The best death text I have seen: "comet #5 came back around (fired 0:38 ago)". Numbered debris let me trace my own mistake. |
| 6 | Instant retry | 2 | "press any key or tap to retry", and play resumed straight away. |
| 7 | Interesting decisions | 0 | In my experience mindless spam (4873) beat my partly deliberate run (3296), and spam also out-earned careful aiming per second. The choices exist (which star, when to clear debris) but they did not pay off. Caveat: stepped time and my screenshot budget limited my deliberate play. |
| 8 | Pattern to learn | 1 | Learning how the arcs bend around the planet is genuinely satisfying, but my score did not improve because of that learning. |
| 9 | Escalation | 1 | Levels and a moon add a second gravity well and debris piles up, so difficulty rises. Runs were short for me (39 to 48 s). |
| 10 | Not solved | 2 | Both strategies died within a minute. |
| 11 | Risk and reward | 2 | Streak multiplier vs. "every miss is debris that hunts you". Spamming paid more and died sooner (39 s vs 48 s), which is a real, nameable tension. |
| 12 | Few verbs, deep use | 2 | Aim plus fire. Fire is both offence (stars) and defence (saving debris). |
| 13 | Variety | 2 | Star layouts differ per seed. Level 2 moves the planet and adds a moon. Debris paths are emergent. |
| 14 | Reward cadence / compounding | 2 | A score event roughly every 1 to 2 s (safe-orbit payouts), and a streak multiplier from ×1.5 to ×2.5. |
| 15 | One more go | 2 | "NEW BEST!" with the score and a stats line ("level 3 · 4/30 comets hit a star · 7 loose shot down"). I want to try again. |

**Total 26/30, so total/3 = 8.7 and Fun score = 9.**

**Primary MDA aesthetic felt:** Challenge, with Discovery from learning the gravity arcs.

**Best moment:** a shot I fired at an unreachable-looking star missed, swung all the way around the planet, and hit a *different* star a second later, giving a delayed +500 jump. Close second: the dotted arc bending round the planet and snapping a lock-on ring onto the star before I fired.

**Worst moment:** two stars sat with countdown rings ticking down while my aim seemed to stop at horizontal, so no arc I could draw reached them. Later, seeing the blind probe beat my careful play.

**Would I play a 4th run?** Yes. I want to know whether careful real-time aiming plus deliberate debris clean-up can beat spam. The arcs are pleasant to read.

**Bugs, glitches, confusion:** no console errors. Confusing moments:
- The SAFE counter did not go up at the moment of a star hit, only later ("safe #2 +50"), so the link between hitting a star and getting a safe orbit was unclear at first.
- The aim appears clamped near ±90°, which made some stars look unreachable.
- At level 2 the field gets cluttered with numbered orange debris labels (#7, #10, #12, #14) and overlapping trails.
- Clicking with the mouse aims *and fires* in one click, with no preview.

---

## 2. magsumo

**What it is (as I understood it):** magnet sumo in a shrinking circular ring. I am a red **N** puck and the CPU is a blue **S** puck. WASD/arrows steer and Space flips my pole (N ⇄ S). Opposite poles attract and like poles repel. Dashed field lines are drawn between the pucks, blue when attracting and red when repelling. The trick: let attraction pull the opponent in, then flip at point-blank range to **SLAM** it away. You have 3 hearts and lose one per round lost. The first opponent is "PEBBLE the Wall (LV 1), heavy & slow". There is also a hot-seat 2-player option ("P2 press ENTER").

| Run | Score | Length | Cause | Mode |
|---|---|---|---|---|
| 1 (seed 202) | 60 | ~22 s, 3 rounds | "slid off the edge on your own (round 3)" | Deliberate start: approached, flipped at about 58 px, and the slam barely moved the heavy CPU. Then I tried to herd it while repelling. Later I looped "attract, steer up, flip" and drove *myself* out of the ring by holding Up. |
| 2 (restart) | 85 | ~23 s | "slid off the edge on your own (round 3)" | **Blind probe**: random arrows/Space, 200 ms each. |
| 3 (restart) | 90 | ~25 s | "slid off the edge on your own (round 3)" | Deliberate: timed the approach, then flipped at point-blank while steering into the CPU (the "brace" the game taught me). That threw PEBBLE right to the lip of the ring. I could not finish it, and then fell back to a hands-off flip loop. Game-over stats: "0 rounds won · 4 slams · 1 braced". |

**Did I improve?** Barely: 60, 85 (probe), 90. I never won a single round against the level-1 opponent. Random input scored about the same as my deliberate play. In stepped time with 15 screenshots I could not see positions between looks, so this real-time positional game hurt me more than any other. A human at a keyboard would do far better.

| # | Principle | Score | Why |
|---|---|---|---|
| 1 | Readable in 5 s | 2 | The first frame shows the controls ("WASD / arrows steer · SPACE flips N ⇄ S"), the physics rule and the opponent's weakness. Steering starts the round. |
| 2 | Clear goal, visible score | 2 | Score, best, hearts, round and opponent name are always visible. Goal: "flip your magnet to push the CPU out of the shrinking ring." |
| 3 | Juicy feedback | 2 | Field lines re-route and change colour the instant you flip. The ring edge glows red near a puck in danger. Big "RING OUT" text, particle bursts, a charge ring on the puck. |
| 4 | Forgiving input | 1 | Hearts (3 rounds) and the edge glow help. I saw no input forgiveness, and one death felt unclear (see #5). |
| 5 | Fair, legible failure | 1 | A cause is always named, but run 3's "slid off the edge on your own" happened while I was not steering at all, so I could not explain it. |
| 6 | Instant retry | 1 | One key restarts, but every round opens with a READY → SET → GO countdown of about 1.4 s. |
| 7 | Interesting decisions | 1 | The decisions are real: when to flip, where to stand, whether to brace. A braced slam visibly beat an unbraced one. But my deliberate scores (60, 90) did not separate from random (85). |
| 8 | Pattern to learn | 1 | I learned "attract, flip point-blank, brace", and the game even taught it with a pop-up. But LV1 felt like a wall I could not climb, so this was a cliff, not a slope, for me. |
| 9 | Escalation | 1 | The ring shrinks within a round and opponents are levelled. Every session I played was under 25 s. |
| 10 | Not solved | 2 | Very much not solved, at least by me. |
| 11 | Risk and reward | 2 | To slam you must get point-blank, inside the range where the CPU can slam *you*, and "SLAM pushes BOTH of you". There is a win-streak multiplier. Clear tension. |
| 12 | Few verbs, deep use | 2 | Steer plus flip. The flip is attract, repel and slam in one verb. |
| 13 | Variety | 1 | Start frames looked nearly identical across seeds (mirrored spawn, same opponent). Variety must come from later opponents, which I never reached. |
| 14 | Reward cadence / compounding | 1 | Points only came from slams (+20/+30), about every 6 s. A streak multiplier exists but stayed at ×1.0 for me. |
| 15 | One more go | 1 | "NEW BEST!" and a stats line are shown. I would try again to win *one* round, but it is a frustrated yes, not an eager one. |

**Total 21/30, so total/3 = 7.0 and Fun score = 7.**

**Primary MDA aesthetic felt:** Challenge, with physical Sensation from the field lines. A Fellowship mode exists but I didn't try it.

**Best moment:** the braced slam in run 3. I flipped while steering *into* PEBBLE, and the heavy puck shot from the centre to the lip of the ring with the edge flaring red, just as the game's pop-up told me "SLAM pushes BOTH of you · brace: keep steering INTO them as you flip". I felt clever.

**Worst moment:** discovering I'd driven myself out of the ring by holding Up while trying to herd the CPU. Then losing run 3 "on your own" while not steering at all.

**Would I play a 4th run?** Yes, grudgingly. I want to win one round, but I am frustrated, not hooked.

**Bugs, glitches, confusion:** no console errors.
- The death cause "slid off the edge on your own" seems to cover being *repelled* off the edge too, which reads as blame when I made no input.
- Unbraced point-blank slams against the heavy CPU did almost nothing, and nothing on screen says that until the brace hint appears. The hint is good, but it only appeared after my first slam.
- One `/step` of 350 ms advanced the game clock only about 117 ms, around the slam. I assume this was hitstop freezing sim time, not a bug.

---

## 3. compound

**What it is (as I understood it):** an engine-building economy race against an exponentially rising "tide". You start with $30. Your score is 10 × your margin (money ÷ tide) every second. Three cards are offered (Seed = flat income, Mill = ×2–2.5 to orthogonal neighbours, Lens = ×2 to a row or column, Bank = interest, Furnace = big income that halves its neighbours, plus rare and legendary variants). You build them onto a 4×4 grid with 1/2/3 (press once to preview, again to build), R rerolls, and arrows/Space move a cursor. Buying costs margin now, and the tide's growth rate keeps rising and throws "rogue waves".

| Run | Score | Length | Cause | Mode |
|---|---|---|---|---|
| 1 (seed 203) | 1320 | ~73 s | "a rogue wave swamped you at 1:12 — keep a bigger buffer above the tide" | Deliberate: Seeds next to a Mill, Lens on the column (one Seed went ×2.5 → ×5 → ×10), Furnace, row Lens, a second Mill, Bank. At ~50 s the tide (+6.24%/s) overtook my growth (+6.13%/s). I rerolled and bought a Mill, drifted at a thin margin, and a wave finished me. |
| 2 (restart) | 274 | ~21 s | "the tide (+3.19%/s) outgrew your engine (+2.31%/s) at 0:21" | **Blind probe**: random 1/2/3/R/Space every 300 ms. |
| 3 (restart) | 1283 | ~65 s | "a rogue wave swamped you at 1:05 — keep a bigger buffer above the tide" | Deliberate, trying "keep a buffer, then buy a Bank". I was too conservative: I waited for ×3.2 margin, it plateaued at ×2.6 and then bled away, I never bought the Bank, and a wave got me. |

**Did I improve?** No: 1320, then 1283. I learned the *right* lesson (Seed income is flat, so your %/s decays while the tide's accelerates, and you need Banks and multipliers *early*), but in run 3 I over-corrected into hoarding. The skill gap, though, is obvious: deliberate play scored about 4.8× the blind probe.

| # | Principle | Score | Why |
|---|---|---|---|
| 1 | Readable in 5 s | 1 | "press 1 2 3 to pick a card" is on screen and I pressed 1 within seconds. But a four-line rules panel sits over the board, and the HUD is dense with jargon ("$30 · you +0.00%/s vs tide +2.00%/s", costs given as "0.25 tide"). I knew *what to press* in 5 s, not *what was good* for about a minute. |
| 2 | Clear goal, visible score | 2 | Score and per-second rate, a huge "×2.94 ABOVE THE TIDE", and a you-vs-tide log graph with a forecast. Goal: "grow faster than the tide; your score is how far above it you are." |
| 3 | Juicy feedback | 2 | A "+15.2%/s GROWTH · your engine just compounded" banner, build particles, a floating "−$15", tile multipliers ticking up (×5 → ×10), the sea visibly rising behind the board, a red tint near the tide, and a "ROGUE WAVE — HOLD ON" banner. |
| 4 | Forgiving input | 2 | A "★ BEST" spot preview with the exact %/s gain, and a "too close to the tide" guard that refuses suicidal purchases. Both are real assists. |
| 5 | Fair, legible failure | 2 | The best causes in the set: "the tide (+3.19%/s) outgrew your engine (+2.31%/s) at 0:21", and the rogue-wave one with actionable advice. Waves are random, but they are telegraphed by a banner and a bump on the forecast graph. |
| 6 | Instant retry | 2 | Restart was immediate and play was live at once. |
| 7 | Interesting decisions | 2 | Deliberate play scored 1320 and 1283 against 274 random (about 4.8×). There are real trade-offs: margin now vs growth later, adjacency, the Furnace's neighbour penalty, reroll cost, and spending vs keeping a wave buffer. |
| 8 | Pattern to learn | 1 | A rich pattern that I clearly grasped (flat income vs compounding tide), but my score did not rise run to run. |
| 9 | Escalation | 2 | The tide's growth rose from 2.0%/s to 6.25%/s within a minute, plus rogue waves. Sessions of 65–73 s. |
| 10 | Not solved | 2 | Every run died in about a minute. |
| 11 | Risk and reward | 2 | The core push-your-luck: every purchase spends the buffer that protects you from a wave. Legendary cards are juicy but "too close to the tide". |
| 12 | Few verbs, deep use | 1 | Margin is both your score and your currency, which is a nice dual purpose. But the input set is large (1, 2, 3, R, four arrows, Space), and "press again to build" vs "build at cursor" was ambiguous. |
| 13 | Variety | 2 | Different card offers per seed (Furnace, Lens column/row, Bank, legendary ×3 Lens), and random waves. |
| 14 | Reward cadence / compounding | 2 | Score ticks every second, and multipliers stack multiplicatively (Mill ×2.5 × Lens ×2 → ×5, then another Mill → ×10). The most Balatro-like of the set. |
| 15 | One more go | 2 | Best is shown in the HUD. I want to run "Bank by 20 s, keep ×1.5 buffer" and see if it beats 1320. |

**Total 27/30, so total/3 = 9.0 and Fun score = 9.**

**Primary MDA aesthetic felt:** Challenge (strategic optimisation), with Discovery as I worked out the tide maths.

**Best moment:** the Column Lens landing and the top Seed's badge jumping ×2.5 → ×5 (and later ×10), with "+15.2%/s GROWTH · your engine just compounded" filling the screen while my margin dropped to a terrifying ×1.07. That was a real gamble that paid.

**Worst moment:**
- In run 1 the Furnace was built at my cursor cell, not at the starred "best spot" the panel had just recommended. That gave me +5.44%/s instead of +10.9%/s.
- Run 3's long passive stretches, watching the margin bleed away with nothing affordable.

**Would I play a 4th run?** Yes. It is the game I most want to replay, because I now have a concrete theory to test.

**Bugs, glitches, confusion:** no console errors.
- **Placement ambiguity:** "pick a card: its best cell glows · press again to build" reads as if a second press builds on the glowing best cell, but it seems to build at the cursor (the panel says "FURNACE here: +5.44%/s · ★ best spot +10.9%/s").
- Costs given in "tide" units (e.g. "0.81 tide") take a while to decode.
- Long waits between affordable purchases make the middle of a run feel idle.

---

## 4. kickback

**What it is (as I understood it):** a lone ship in a circular arena ringed by an electric rim. ← → rotate and Space fires. There is no thrust: "recoil is your only engine", so every shot pushes you backwards. Rocks split when shot, and orange seekers spawn from warning arcs on the rim. Touching the rim kills you, but skimming it raises the multiplier ("SKIM RIM = MULT"). Firing builds HEAT and overheating LOCKS the gun. Kills in quick succession build a CHAIN.

| Run | Score | Length | Cause | Mode |
|---|---|---|---|---|
| 1 (seed 204) | 420 | ~41 s, wave 3 | "caught by a seeker" | Deliberate: calibrated turning (about 180° per 0.4 s), lined up and split the first rock (+20), noticed recoil had carried me to the rim, turned and fired to brake. Then a "turret" loop: fire, turn 180°, fire, so the recoils cancel. Stats: 9 kills, 3 point-blank, peak ×1.0. |
| 2 (restart) | 1930 | ~26 s, wave 2 | "smashed by a big rock" | **Blind probe**: random rotate/fire every 200 ms. It hit a CHAIN ×7 near the end and jumped from 260 to 1930 in about 7 s. |
| 3 (restart) | 240 | ~30 s | "smashed by a big rock" | Deliberate "spin-and-spray" (a full rotation of fire cancels recoil, pausing for heat). Poor. |
| 4 (restart) | 340 | ~20 s | "clipped by a rock shard" | **Blind probe #2**, to check variance. |

(I also used one extra restart to test drifting to the rim on purpose. There is friction, so it takes more shots than expected, and I never triggered the rim multiplier.)

**Did I improve?** No. Deliberate 420 and 240 vs random 1930 and 340. Scores look dominated by whether a CHAIN happens, and random mashing found one while I didn't. This is the twitchiest game of the set, and stepped time hurt: one 50 ms tick of rotation is about 20° of aim.

| # | Principle | Score | Why |
|---|---|---|---|
| 1 | Readable in 5 s | 2 | "← → rotate · SPACE fire · recoil is your only engine / don't touch the electric rim · skim it for multiplier" on the first frame, and any key starts. |
| 2 | Clear goal, visible score | 2 | Score, best, wave, a big ×mult and a HEAT bar. Goal: "shoot rocks and seekers, using recoil to move, without touching the rim." |
| 3 | Juicy feedback | 2 | Rocks split with a floating "+20" and debris, the rim crackles, the screen flashes red on death, a "CHAIN ×7" banner, a heat bar that reads "LOCKED", and a velocity arrow plus aim tracer on the ship. |
| 4 | Forgiving input | 1 | A rim shield at wave start and a dotted aim tracer. Turning is very fast with no aim assist I could notice, and I could not see what killed me coming. |
| 5 | Fair, legible failure | 2 | "caught by a seeker", "smashed by a big rock", "clipped by a rock shard": specific causes, plus a stats line. |
| 6 | Instant retry | 2 | "press any key / tap to retry". Play is live immediately. |
| 7 | Interesting decisions | 0 | Random beat or matched me (1930/340 vs 420/240). The decisions exist (which way to fire when it also moves you), but my deliberate choices did not pay. Strong caveat: twitch aiming in stepped time. |
| 8 | Pattern to learn | 1 | I learned recoil-steering and recoil-cancelling, but the scoring systems the stats line points to ("point-blank", "peak ×") stayed opaque. |
| 9 | Escalation | 1 | Waves, seekers arriving, and the rim shield fading. My sessions were short (20–41 s). |
| 10 | Not solved | 2 | No strategy lasted. |
| 11 | Risk and reward | 2 | Skimming the deadly rim for a multiplier, point-blank kills, and heat lock for over-firing all create real tension. I just couldn't exploit it. |
| 12 | Few verbs, deep use | 2 | The best verb design in the set: two verbs, and fire is weapon, engine and brake. Pure *Downwell*. |
| 13 | Variety | 2 | Rock and seeker spawns differ visibly run to run. |
| 14 | Reward cadence / compounding | 1 | CHAIN and rim multipliers compound, but in deliberate play I went 10+ s without a scoring event. |
| 15 | One more go | 2 | "★ NEW BEST ★" plus stats on the game-over panel. The recoil hook makes me want to try at real speed. |

**Total 24/30, so total/3 = 8.0 and Fun score = 8.**

**Primary MDA aesthetic felt:** Challenge, with Sensation from the recoil physics.

**Best moment:** finally lining up the first rock and watching it split for "+20". Then realising I was drifting into the rim, spinning 180° and firing *away* from it to brake. The verb clicking into a second use felt great.

**Worst moment:** discovering that a random masher's CHAIN ×7 outscored everything I had carefully done by 4.6×.

**Would I play a 4th run?** Yes. I did, and a 5th. At real speed with a keyboard I think it's a strong game, and I want to learn to skim the rim.

**Bugs, glitches, confusion:** no console errors.
- The game-over stats mention "point-blank" and "peak ×1.0", but nothing taught me how point-blank scoring or the multiplier work before I died.
- Turning is very fast (about 450°/s), which makes small aim corrections hard.
- The heat "LOCKED" state happened without my noticing it building.
- The ship has friction, so drifting to the rim to skim takes more shots than the text suggests.
