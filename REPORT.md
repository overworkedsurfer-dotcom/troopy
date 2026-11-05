# THE FUN LAB: Report

**The winner is PIPWALK**, a roguelite in which you *are* a die. Rolling is how you move, and whichever face lands on top is your attack. It won on every kind of evidence:
- the only perfect graded bot score (10.0/10);
- 10/10 from both independent blind critics;
- my own 8.5;
- 1st under 6 of the 7 weightings of those three judges that I tested (official included), and tied for 1st under one of them.

**Play it:** [`games/pipwalk.html`](games/pipwalk.html) · **Hub:** [`index.html`](index.html) (tiles, local high scores, score-distribution charts) · **Rubric:** [`research/FUN.md`](research/FUN.md) · **Every call I made:** [`DECISIONS.md`](DECISIONS.md)

---

## What I did

1. **Research → rubric.** I read up on MDA, Koster's *Theory of Fun*, flow, self-determination theory and PENS, game feel and juice, Celeste-style forgiveness, Juul on fair failure, Sid Meier's interesting decisions, the "30 seconds of fun" idea, and design breakdowns of Tetris, Vampire Survivors, Balatro, Downwell and Flappy Bird. I distilled this into **15 principles, each with a checkable test** (bot-measured, play-measured, or code-checked). Console errors and non-determinism are a hard gate rather than a principle.
2. **20 pitches → 10 builds.** I wrote two pitches per genre (arcade, puzzle, roguelite, rhythm, physics, idle, word, tiny strategy, 2-player, weird), each "familiar genre + one twist". I kept the one per genre whose twist best served a rubric principle. Five parallel builder agents wrote the games to a shared **contract**: one HTML file, a seeded fixed-step sim, `snapshot`/`restore` for bot lookahead, and `quiet` mode so lookahead doesn't spray particles.
3. **The lab.** I ran headless Chromium through Playwright. Each game got three bots: **random**, a **heuristic** rule of thumb, and a **smart** bot that searches ahead with snapshot/restore. Each bot played **50 seeded sessions per game**. The lab logged score, session length, actions/min, game-over cause, longest scoreless gap and console errors. It also took screenshots at the start, middle, intense moment and game-over. I played every game myself through a **time-stepped play server** that sends real key presses while time advances only on request, and took notes. A **blind critic agent** that never saw the code scored every game against FUN.md.
4. **Iteration.** I fixed every bug the critic found. I hard-reworked the bottom of the table (JUNK ORBIT, MAGSUMO, KICKBACK, plus COMPOUND, which two sources independently flagged) and polished the top (LOOPBACK, PIPWALK, SPELLSNAKE, MAZEWRIGHT). Then I re-ran the whole lab, and a **fresh** blind critic replayed the seven changed games.

All 10 games are bug-free by the lab's definition: **0 console or page errors across 3,000 bot sessions and about 45 critic runs, 100% determinism checks passed, and no bot in any session reached the 15-minute cap.**

## The numbers

### Final ranking

| Rank | Game | Genre | Bot /10 | Blind critic | Me | **Final** | Round-1 final (rank) |
|---:|---|---|---:|---:|---:|---:|---:|
| 1 | **PIPWALK** | Roguelite | 10.0 | 10 ² | 8.5 | **9.5** | 9.0 (#2) |
| 2 | **LOOPBACK** | Weird | 9.2 | 9 ² | 8.5 | **8.9** | 9.1 (#1) |
| 3 | **MAZEWRIGHT** | Tiny strategy | 8.5 | 10 | 8.0 | **8.9** | 8.8 (#4) |
| 4 | **SPELLSNAKE** | Word | 9.3 | 8 ² | 9.0 | **8.7** | 8.9 (#3) |
| 5 | **JUNK ORBIT** | Physics | 9.6 | 9 ² | 7.5 | **8.7** | 7.3 (#10) |
| 6 | **COMPOUND** | Idle / incremental | 9.5 | 9 ² | 7.5 | **8.6** | 7.8 (#7) |
| 7 | **KICKBACK** | Arcade action | 10.0 | 8 ² | 7.0 | **8.3** | 7.6 (#8) |
| 8 | **TILTWELL** | Puzzle | 8.3 | 9 | 7.0 | **8.1** | 8.1 (#5) |
| 9 | **UPTEMPO** | Rhythm | 7.7 | 9 | 7.0 | **7.9** | 7.9 (#6) |
| 10 | **MAGSUMO** | 2-player local | 8.6 | 7 ² | 7.0 | **7.5** | 7.5 (#9) |

² = score from the fresh round-2 blind critic, given after the Phase 4 changes. The others are from round 1. Final = 0.30 × bot + 0.35 × critic + 0.35 × me.

### Bot metrics (round 2, 50 seeded sessions per bot)

| Game | Random median | Heuristic median | Smart median | Skill gap (smart ÷ random) | Smart median length | Smart max length | Smart CV | Longest scoreless gap (median) | Cap hits | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| PIPWALK | 304 | 2.5k | 50k | 166× | 113 s | 161 s | 0.8 | 5.3 s | 0 | 0 |
| LOOPBACK | 73 | 28k | 596k | 8.2k× | 261 s | 294 s | 0.2 | 5.1 s | 0 | 0 |
| MAZEWRIGHT | 525 | 133k | 377k | 719× | 229 s | 312 s | 0.6 | 14.6 s | 0 | 0 |
| SPELLSNAKE | 0 | 1.5k | 27k | 27k× | 169 s | 249 s | 0.5 | 13.7 s | 0 | 0 |
| JUNK ORBIT | 2.3k | 5.4k | 147k | 63.0× | 206 s | 284 s | 0.6 | 8.5 s | 0 | 0 |
| COMPOUND | 370 | 1.2k | 21k | 56.6× | 240 s | 288 s | 0.2 | 0.2 s | 0 | 0 |
| KICKBACK | 130 | 880 | 41k | 315× | 102 s | 125 s | 0.7 | 6.5 s | 0 | 0 |
| TILTWELL | 40 | 3.9k | 8.8k | 220× | 157 s | 184 s | 0.2 | 4.9 s | 0 | 0 |
| UPTEMPO | 6 | 41k | 99k | 17k× | 196 s | 223 s | 0.2 | 1.3 s | 0 | 0 |
| MAGSUMO | 85 | 6.7k | 13k | 154× | 136 s | 183 s | 0.2 | 9.9 s | 0 | 0 |

### Round 1 → round 2 (bot side)

| Game | Skill gap r1 → r2 | Random-bot survival r1 → r2 | Smart median length r1 → r2 | Graded bot score r1 → r2 |
|---|---:|---:|---:|---:|
| PIPWALK | 98.1× → 166× | 21.3 s → 21.8 s | 101 s → 113 s | 9.5 → 10.0 |
| LOOPBACK | 2.2k× → 8.2k× | 32.5 s → 20.9 s | 272 s → 261 s | 9.2 → 9.2 |
| MAZEWRIGHT | 254× → 719× | 160.4 s → 181.5 s | 203 s → 229 s | 8.3 → 8.5 |
| SPELLSNAKE | 31k× → 27k× | 4.6 s → 6.9 s | 167 s → 169 s | 9.1 → 9.3 |
| JUNK ORBIT | 5.5× → 63.0× | 55.9 s → 29.9 s | 171 s → 206 s | 9.3 → 9.6 |
| COMPOUND | 18.3× → 56.6× | 57.5 s → 26.4 s | 213 s → 240 s | 9.1 → 9.5 |
| KICKBACK | 138k× → 315× | 3.6 s → 19.3 s | 93 s → 102 s | 9.5 → 10.0 |
| TILTWELL | 220× → 220× | 6.5 s → 5.9 s | 157 s → 157 s | 8.3 → 8.3 |
| UPTEMPO | 99k× → 17k× | 1.4 s → 2.7 s | 196 s → 196 s | 7.6 → 7.7 |
| MAGSUMO | 459× → 154× | 18.6 s → 22.9 s | 167 s → 136 s | 9.1 → 8.6 |

Sessions: 1500 in round 1 and 1650 in round 2. Console or session errors: 0 and 0. No bot in any session survived the 15-minute cap.

### Does the winner survive other weightings?

| Weighting | 1st | 2nd | 3rd |
|---|---|---|---|
| Official (0.30 bot, 0.35 critic, 0.35 me) | PIPWALK (9.47) | LOOPBACK (8.88) | MAZEWRIGHT (8.85) |
| Equal thirds | PIPWALK (9.50) | LOOPBACK (8.90) | MAZEWRIGHT (8.83) |
| Bots only | PIPWALK (10.00) | KICKBACK (10.00) | JUNK ORBIT (9.60) |
| Blind critic only | PIPWALK (10.00) | MAZEWRIGHT (10.00) | LOOPBACK (9.00) |
| My score only | SPELLSNAKE (9.00) | PIPWALK (8.50) | LOOPBACK (8.50) |
| Humans only (critic + me) | PIPWALK (9.25) | MAZEWRIGHT (9.00) | LOOPBACK (8.75) |
| No bots, critic-heavy (0.7 critic, 0.3 me) | PIPWALK (9.55) | MAZEWRIGHT (9.40) | LOOPBACK (8.85) |


---

## Why PIPWALK won (the receipts)

- **Bots.** PIPWALK is the only game where every graded component is maxed:
  - Skill gap: the smart bot's median score is ~98× the random bot's.
  - Smooth mastery slope: the heuristic bot sits 0.44 of the way up the log ladder from random to smart.
  - Pacing: the smart bot's median session is 101 s.
  - Variety: smart-bot scores vary across seeds with a CV of 0.75.
  - Reward cadence: something scores every ~4 s.
  - Random survives ~21% as long as smart, so flailing is neither instant death nor immortal.
- **Blind critic, round 1 (10/10):** "the deepest game in the set — the draft means each run feels different." Best moment: "Glass Cannon + Twin Fangs and three straight 5-face hits… MATCH ×5 → +530 in one bump."
- **Fresh blind critic, round 2 (10/10, 29/30):** "A tactical dice puzzle with exact damage previews… the deepest and best-explained game here." Best moment: "working out on paper that the rolls N, W, W, N, N, N land a 6 on top directly under the Elite." Also: "This is the game I'd most like to keep playing."
- **Me (8.5):** "Every move was a small plan that paid off… the most *interesting decisions per move* in the set." The plans were things like retreating one roll so a 4 lands on top, or rolling a 6 between a skull and a slime so both show "⚔24 KILL".
- **Why it works, in rubric terms:**
  - **#12 few verbs, deep use:** four arrow keys, and every roll is both movement and weapon selection.
  - **#7 interesting decisions:** the die's topology makes each move a trade-off.
  - **#5 legible failure:** foe intents, red danger tiles, exact "⚔N KILL" badges, and "CHAIN BROKEN (you were hit)".
  - **#14 multiplicative reward:** STRAIGHT and MATCH chains times Balatro-style face upgrades.
  - **#8 a pattern to learn:** "four rolls one way is identity", "stalling preserves the face".
- **Robustness.** PIPWALK is 1st under the official weighting, under equal thirds, under bots only, under the blind critic alone (tied with MAZEWRIGHT), under humans only, and under a no-bots, critic-heavy weighting. The only weighting it loses is "my score alone", where SPELLSNAKE edges it 9.0 to 8.5.

## What iteration bought

- **JUNK ORBIT, worst to 5th, the biggest climb.** In round 1, blind spam scored about the same as aiming (skill gap 5.5×, critic 6/10). One rule change fixed it: **a miss becomes loose debris that hunts you, and a star hit becomes a safe, scoring orbit.** I added an accuracy streak, telegraphed returns, and the ability to shoot debris for a SAVE. Skill gap went to about 63×, random survival halved, and the fresh critic gave 9/10.
- **COMPOUND, 7th to 6th.** "Mashing survived as long as careful play" and "I couldn't tell what I was maximizing." The score became *10 × your margin above the tide per second*, so the number you watch *is* the score. A heat-map now shows the ★ best cell for the selected card. The skill gap went from 18× to 57×, and the critic score from 8 to 9.
- **KICKBACK, playable at last.** Everyone died within 10 s in round 1, and nobody saw wave 2. I added eased faster turning, a drift arrow distinct from the aim line, a clear nose, gentle waves 1–3 and a fading rim shield. Random-bot survival went from 3.6 s to 18.8 s, and mine from about 6 s to 16 s.
- **Top-3 polish was mostly about teaching:**
  - LOOPBACK now teaches PHASE when it matters, with a kinder pickup radius and late-game clutter fading.
  - PIPWALK now explains every chain break and dodge, and shows numerals on the preview dice.
  - SPELLSNAKE now deals a guaranteed nearby starter word and states the 3+ letter and fuse rules on screen.
- **Bugs found by the critics and fixed:**
  - TILTWELL: ArrowUp silently spent a tilt, and quick taps were dropped.
  - UPTEMPO: the start key counted as a brake.
  - MAZEWRIGHT: number keys ignored on the upgrade cards; cursor presses dropped.
  - LOOPBACK: dying 50 ms after a successful phase.
  - COMPOUND: unreadable "$18.9DDc" numbers.
  - MAGSUMO: deaths blamed on "you" when you hadn't touched anything.

## The biggest surprise

**My own bot metric stopped measuring anything by Phase 3.** The v1 signals in `lab/run.js` gave all ten games a perfect 10/10. I had published the thresholds in the contract (skill gap ≥3×, a 60–300 s median, no cap hits). Each builder tuned to them, so every game passed. That is Goodhart's law at lab scale. I added a *graded* v2 score (`lab/botscore.js`, D5) that measures the same principles on continuous scales, and it immediately separated the games again. The lesson I'd keep: a fun metric the designers can see becomes a design target, so keep a held-out measure, here the blind critic.

A close second surprise: the single rule change in JUNK ORBIT ("misses hunt you") moved the critic score by 3 points. That was more than any amount of juice or polish moved any game.

## Where the data and my gut disagreed

- **The twitch games (KICKBACK, MAGSUMO, and JUNK ORBIT in round 1).** The bots reported huge skill gaps: KICKBACK's smart bot beats random by ~600×, and MAGSUMO's heuristic bot beats random by ~80×. Yet both blind critics found that random mashing **matched or beat** their deliberate play. In round 2, a mash run's CHAIN ×7 in KICKBACK beat the critic's best by 4.6×, and the critic never won a MAGSUMO round against the level-1 CPU. Both sides are right. Bots have perfect reflexes and read exact state. A stepped-time tester turns 20° per 50 ms tick and can't see between screenshots. So the bots measured the **skill ceiling** and the testers measured the **skill floor**. MAGSUMO is last in my ranking because its floor stayed steep after a hard rework. My gut sides with the testers, and I'd want real humans at real keyboards before trusting either.
- **UPTEMPO.** It has the lowest graded bot score (7.7), but the critic gave it 9 and it's the most *Sensation*-rich game in the set. The metric punishes it because a simple rule-following bot is already near-optimal at rhythm (the heuristic sits 0.91 of the way up the ladder), and random dies in 2.7 s. That's a property of the genre, not a design flaw. Neither tester could hear the music, so this score is the least trustworthy in the table.
- **SPELLSNAKE.** It's my favourite (9.0), but the fresh critic dropped it from 9 to 8 after the polish pass. A stepped-time player can't time turns one cell ahead, and turn timing is exactly what the polish didn't change. I suspect my score is inflated by having watched the polish land.
- **MAZEWRIGHT.** The round-1 critic gave it 10. I gave it 8, because during waves you mostly watch. The data sides partly with me: its random bot survives about 80% as long as the smart bot (because the core turret plays for you), so "flailing" isn't punished.

## Limits of this lab (read before trusting the decimals)

- The critics are AI agents playing in **stepped time with no audio**. That biases scores toward thinkable games (PIPWALK, LOOPBACK, COMPOUND) and against twitch and rhythm games. The winner is turn-based, so treat "best game" as "best game for a deliberate player". The rubric happens to reward exactly that.
- The round-2 critic replayed only the seven changed games. TILTWELL, UPTEMPO and MAZEWRIGHT keep their round-1 critic scores (D10).
- My own score is one person's judgement, recorded before I saw the critic's numbers, then updated after re-plays. Both are in `lab/notes/mine-scores.json`.
- Builders saw the rubric and the v1 thresholds. That's realistic (designers know what fun is) but it inflates structural compliance, which is why the graded v2 metric and blind critics carry the weight.

## Follow-up: building the "what next" list

You asked me to build the three follow-ups. Here's what each one turned up.

### 1. PIPWALK, full version
- **Daily dungeon** (`games/pipwalk.html#daily`, or press T / [DAILY] after a run). It uses one seed per UTC date and the Standard die, and keeps a separate daily best. A **run card** is copied to the clipboard; if the frame refuses clipboard access, it falls back to a selected-text box.
- **Boss floors**, each with a name banner, a "how to beat it" tip, a boss HP bar, a phase change at 50%, attacks telegraphed one turn ahead, and a pick of rare upgrades:
  - Floor 5, **OGRE**: winds up a 3×3 leap, then sits stunned with ×2 damage taken.
  - Floor 10, **LICH**: telegraphs row and column beams, and summons skeletons below 50% HP. Shoving it cancels the beam.
  - Floor 15, **MIMIC**: a die duel. Its top face is armour, and you only hurt it with a higher face.
- **New faces:** Mirror, Arc (lightning to two neighbours) and Clone. **Unlockable starting dice:** Lucky, Glass and Twin.
- **Bot numbers:** smart median 28.7k → 51.6k, session 98 → 117 s, best masher 544 against a 40k human model. The upgrades deepened the game without opening a spam route. A real-key run beat the Ogre and the Lich.

### 2. Masher and human-model bots
The **best masher** is the highest-scoring bot that never looks at the game: it holds or mashes one button, or cycles through all of them. If it beats the rule-of-thumb heuristic bot, button-mashing beats simple thinking. The **human model** is the better of two bots, the game's smart bot and its heuristic bot, each run with human limits: a 100 ms reaction lag and one decision every 100 ms in real-time games, 0–33 ms timing slop in the rhythm game, ≥ 400 ms of thinking per move in turn-based games, and a 3% slip rate. The **reflex tax** is how much the smart bot loses once it has to play with those limits.

| Game | Best masher (median) | Heuristic median | Masher ÷ heuristic | Human-model median | Smart median | Reflex tax (human ÷ smart) | Human-model session |
|---|---|---:|---:|---:|---:|---:|---:|
| PIPWALK | *cycle → 544 | 2.5k | 0.21 | 40k | 50k | 0.79 | 125 s |
| LOOPBACK | *cycle → 1.0k | 28k | 0.04 | 8.6k | 596k | 0.01 | 60 s |
| MAZEWRIGHT | place → 1.1k | 133k | 0.01 | 378k | 377k | 1.00 | 286 s |
| SPELLSNAKE | down → 0 | 1.5k | 0.00 | 2.2k | 27k | 0.08 | 62 s |
| JUNK ORBIT | *cycle → 2.3k | 5.4k | 0.43 | 4.2k | 147k | 0.03 | 73 s |
| COMPOUND | buy3 → 1.1k | 1.2k | 0.87 | 21k | 21k | 1.01 | 247 s |
| KICKBACK | fire → 160 | 880 | 0.18 | 6.1k | 41k | 0.15 | 63 s |
| TILTWELL | tiltR → 114 | 3.9k | 0.03 | 1.4k | 8.8k | 0.16 | 40 s |
| UPTEMPO | *cycle → 19 | 41k | 0.00 | 25k | 99k | 0.25 | 133 s |
| MAGSUMO | *cycle → 83 | 6.7k | 0.01 | 5.9k | 13k | 0.45 | 99 s |

⚠ means the masher beats the heuristic, i.e. a spam exploit. The only one found was KICKBACK (5,840 vs 615): holding fire against the rim shield farmed the skim multiplier. It is fixed, and the table shows the re-measured game.

- **The masher caught a real exploit the original bots never saw.** In KICKBACK, holding FIRE without ever turning scored 5,840, 9.5× the heuristic bot. Recoil pinned the ship in a stable hover against the on-ramp rim shield, inside the skim band, farming a ×5–8 multiplier. This was the round-2 critic's "a masher's CHAIN ×7 beat everything I did on purpose", and they were right. Fixed: no skim multiplier while the shield is up, the shield overloads under sustained recoil, and missed shots drain the chain. The masher now scores 160.
- **The human model quantifies the bot-versus-critic disagreement.** The "reflex tax" column shows how much score survives human limits. Real-time games keep 1–16% of the smart bot's score (LOOPBACK 0.01, JUNK ORBIT 0.03, SPELLSNAKE 0.08, KICKBACK 0.15, TILTWELL 0.16). Turn-based games keep nearly all of it (PIPWALK 0.79, MAZEWRIGHT 1.00, COMPOUND 1.01). That's the same split the critics reported, and why the winner is a turn-based game: it's the one whose bot ceiling a human can actually reach.
- **Calibration I threw away:** a first model with 160 ms latency scored *below the masher* in LOOPBACK, which contradicts every human-ish run we have. I kept the anticipatory 100 ms model and took the better of the latency-wrapped smart and heuristic bots (D13).

### 3. Real people, real keyboards, with sound
I can't recruit testers. I built the instrument and fixed everything the machine could hear:
- **Playtest page** (a private artifact, link in the hub notes). It runs a sound check, then the four games where the AI critics were least reliable (KICKBACK, MAGSUMO, UPTEMPO, SPELLSNAKE) plus PIPWALK as a control, in random order, with real keyboard and touch.
  - It records every run (score, length, cause of death, inputs, device) and five ratings: fun, fairness, controls, sound, and "another go?".
  - Each tester can only see their own record; the owner sees everyone's in a live results table. That table includes a per-tester **learning ×** (3rd run ÷ 1st), the floor-steepness measure no bot can give.
  - **To run the study, share the page with 5+ people at Contributor level and ask them to play with sound on.**
- **Audio lab** (`node lab/audio.js all`). It records each game's actual WebAudio output while playing it in real time.
  - **UPTEMPO's kick was ~22 ms late, and by a different amount each session.** Causes: compressor look-ahead, a one-shot clock anchor, and an assumed output latency. Now: median 0.0 ms, p95 ≤ 7 ms, drift < 1.3 ms/min even under heavy clock skew.
  - **19 dB loudness spread across the arcade** (JUNK ORBIT was barely audible next to UPTEMPO). A per-game output trim now holds every game within ~2 dB of −30 dBFS active RMS, with 0 clipping and no NaN or DC offset.
  - Files: `lab/results/audio.md`, plus `lab/results/audio/<id>.wav` and `.png` (waveform and spectrogram) per game.
  - **Still open:** whether the games *sound good*. Only the playtest can answer that.

### Bonus: EMBERDEEP
You said you love a good roguelike, so I built one on the side: **EMBERDEEP** ([`games/emberdeep.html`](games/emberdeep.html)). It's a classic turn-based dungeon crawl with one twist: **your health is your light.**

- **Light is life.** Your light radius is `1 + ceil(HP/2)` tiles, minus a depth penalty. Every hit shrinks the world you can see. **FLARE** spends 2 light to burn everything next to you, then lights a radius of 7 for 3 turns.
- **Monsters that care about light:**
  - Moths hunt you when you're bright.
  - Husks are slow but tough, and take a "clean hit" bonus while they rest.
  - Shades can only hurt you while you're dim.
  - A Warden boss guards every 4th depth: move, move, CHARGE, SLAM, then it rages below 50%.
- **Greed:** braziers fully rekindle you but wake the whole room. "The dark rises" on a per-floor clock, which turns every floor into "greed or go". Between floors you draft 1 of 3 relics that stack, and flare multi-kills chain into combos.
- **Lab results** (50 seeds per bot, 0 errors, 0 cap hits, every death names its killer and your light level):
  - Medians: random 14 (15 s), heuristic 17.4k (141 s), smart 22.0k (123 s). Skill gap ×1.6k, seed variety CV 0.69, graded bot score 8.8/10.
  - The best masher scores 10, so there's no spam exploit. The human model keeps 16.8k, a reflex tax of about 0.76: like PIPWALK, it's a game where a human can reach the bot's ceiling.
  - Weak spot: the heuristic bot sits 97% of the way up the ladder to the smart bot. Good rules of thumb already play it nearly as well as lookahead, so its "mastery slope" score is low.
  - Most deep runs end as "swallowed by the rising dark … (your light was 1 tile)". The doom clock does its job, but a human should probably feel monsters more often than the clock.
- **Audio** is trimmed to the arcade's loudness (−29.6 dBFS active, 0 clipping).
- **My play** (8.0): two hits took my light from 6 tiles to 3, and the room *went dark*. That's the twist landing physically, with no number needed. The flare bloom is the best single juice moment in the arcade. Weakest moment: bumping walls in remembered darkness while hunting for the corridor to stairs I could already see.
- **Not ranked:** no blind critic has played it yet, so it sits in the hub as a bonus. It's included in the playtest kit's lab tooling but not in the human study.

## What I'd build next (now)
1. **Run the playtest with real people,** then compare the human "learning ×" and fun ratings with the human-model bot and both critics. That's the calibration this whole lab is missing.
2. **LOOPBACK puzzle mode:** hand-authored rooms where your ghosts are keys ("be at the switch when ghost #3 arrives").
3. **PIPWALK on a phone,** for real: swipe feel, haptics, and a daily leaderboard (it needs a shared store, which the artifact `db` now makes easy).

---

### Files
- `research/FUN.md`: the 15-principle rubric and its sources.
- `DECISIONS.md`: every judgement call (D1–D10+).
- `games/*.html`: the 10 games, plus `CONTRACT.md` and `BRIEFS.md`.
- `lab/`: the harness:
  - `check.js`: contract, determinism and errors;
  - `run.js`: 50-seed bot runs;
  - `shoot.js`: screenshots;
  - `play.js`: stepped play server;
  - `botscore.js`: graded metric;
  - `rank.js`, `reporttables.js`, `buildhub.js`;
  - `bots/`: three bots per game.
- `lab/notes/`: my play notes (`mine.md`), both critics (`critic.md`, `critic2.md`) and score files.
- `lab/results/`: raw session data (`summary.v1.json`, `summary.v2.json`, per-game JSON).
