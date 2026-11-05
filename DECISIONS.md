# Decisions Log

These are calls I made on my own without stopping to ask, in the order I made them.

## D1. Scoring rubric shape (Phase 1)
- I chose 15 principles, each scored 0/1/2, giving a total out of 30 that maps to a 1–10 scale. This is coarse enough for a critic to apply consistently and fine enough to rank 10 games.
- Robustness (console errors, determinism) is a **hard gate**, not a principle. A buggy game cannot be measured, so it should not be able to "earn back" points elsewhere.
- Final rank weights: bot 30%, blind critic 35%, my own play 35%. Bots measure structure (skill gap, pacing, variance), but they cannot feel juice, so humans and humanlike judges get the majority.

## D2. Twenty pitches (Phase 2)
Each pitch combines a familiar genre with one novel twist. There are two pitches per requested genre.

| # | Genre | Name | Pitch (genre + twist) |
|---|-------|------|------------------------|
| 1 | Arcade action | **KICKBACK** | An Asteroids-style arena shooter with no engine: every shot kicks you backward, so your gun is your only thruster. |
| 2 | Arcade action | GRAZE | A bullet dodger where you score only by skimming bullets. Playing safe earns nothing. |
| 3 | Puzzle | **TILTWELL** | A falling-block colour puzzle where you never rotate pieces. You rotate the whole well 90° and gravity re-settles everything. |
| 4 | Puzzle | FUSE | A one-tap chain-reaction puzzle where whatever survives each blast multiplies for the next round. |
| 5 | Roguelite | **PIPWALK** | A grid dungeon crawl where you *are* a die. Rolling onto a tile tips you over, and the face that lands on top is your attack. |
| 6 | Roguelite | SHRINKWRAP | A survivors-like where every level-up makes you stronger but shrinks the arena. |
| 7 | Rhythm | **UPTEMPO** | A 4-lane note highway where your accuracy drives the BPM: perfect hits speed the song (and multiplier) up, and sloppy hits slow it down. Difficulty adjustment becomes the mechanic. |
| 8 | Rhythm | CALL & ECHO | A call-and-response rhythm game where every missed note becomes part of the next phrase. |
| 9 | Physics | **JUNK ORBIT** | A slingshot comet around gravity wells to hit targets. Every comet you fire stays in orbit forever as debris, so your history becomes the level. |
| 10 | Physics | JELLY TOWER | A soft-body stacking game in a wind that gets steadily stronger. |
| 11 | Idle / incremental | **COMPOUND** | A whole incremental game squeezed into a 3-minute run against an exponentially rising debt line. Generators sit on a tiny grid where adjacency multiplies. |
| 12 | Idle / incremental | SLOW BURN | An idle fire-keeper where every upgrade burns more fuel. |
| 13 | Word | **SPELLSNAKE** | Snake where your body is the word. Eat letters to spell, then cash in a valid word to shrink. Longer words score more but leave you longer and in more danger. |
| 14 | Word | WORDFALL | Tetris with letter blocks: spell words across or down to clear. |
| 15 | Tiny strategy | **MAZEWRIGHT** | Tower defence where you never build towers. One central turret, a tiny grid, and three wall pieces per wave: the path you force is your only weapon. |
| 16 | Tiny strategy | THREE LANES | A one-card-per-turn auto-battler across three lanes. |
| 17 | 2-player local | **MAGSUMO** | Sumo on a shrinking ice ring where you cannot touch the other player. You can only steer and flip your magnet's polarity to attract or repel. |
| 18 | 2-player local | TUG-PONG | Pong where your paddle grows as you fall behind. |
| 19 | Weird | **LOOPBACK** | A dodge-and-collect arena where every 8 seconds a ghost of your own past movement starts replaying. Touching any past self kills you, so your own history is the bullet hell. |
| 20 | Weird | YOU ARE THE FLOOR | An auto-runner where you don't control the runner, only the terrain under them. |

## D3. Picking ten (Phase 2)
The bold pitches are the ten to build, one per genre, which guarantees the variety the brief asks for. Inside each genre I picked the pitch whose twist best serves a principle from FUN.md, and which a bot could measure:

- **KICKBACK over GRAZE.** One verb does two jobs: shooting is also how you move (principle 12, the *Downwell* lesson). GRAZE is a single-axis risk/reward idea, and I fold its near-miss bonus into KICKBACK and LOOPBACK instead.
- **TILTWELL over FUSE.** Rotating the world produces emergent cascades from simple rules (principles 8 and 13). FUSE is closer to a toy, with mostly one tap per round.
- **PIPWALK over SHRINKWRAP.** It is turn-based, so it is ideal for lookahead bots and for "interesting decisions" (principle 7). The die-as-body twist is new to me. SHRINKWRAP is closer to a survivors clone.
- **UPTEMPO over CALL & ECHO.** It makes Jenova Chen's dynamic difficulty a visible, player-driven mechanic. Greed (staying perfect) raises both the score rate and the danger (principle 11). It also has a natural hard ceiling, so it is never solved.
- **JUNK ORBIT over JELLY TOWER.** Self-made escalation (principle 9) with an emergent mess (principle 13). Deterministic soft-body physics is a big risk in one file.
- **COMPOUND over SLOW BURN.** Its adjacency multipliers are the Balatro lesson (principle 14), and the debt line gives an idle game a real game-over and escalation.
- **SPELLSNAKE over WORDFALL.** The cleanest risk/reward in the set: word length versus body length (principle 11).
- **MAZEWRIGHT over THREE LANES.** Spatial decisions with visible consequences, so failure is legible (principle 5).
- **MAGSUMO over TUG-PONG.** An indirect verb (polarity) is more novel than a paddle, and it plays solo against a CPU ladder.
- **LOOPBACK over YOU ARE THE FLOOR.** The difficulty is generated entirely by the player's own past choices. That is weird, emergent, and easy to grok in 5 seconds.

## D4. Engineering contract
- All games follow `games/CONTRACT.md`: one HTML file, fixed-step simulation, all sim state in one snapshot-able object with a seeded RNG inside it, and `window.__game` with the 7 required methods plus `snapshot`, `restore`, `quiet` and `render`.
- **Why `snapshot`/`restore`:** the "smart" bots need lookahead. Cloning sim state is the simplest correct way to search, and it doubles as a determinism test.
- **Why `quiet`:** bot lookahead must not spray particles and sounds for futures that never happen.
- **Cosmetic effects advance inside `tick()`** using a separate non-seeded RNG. Screenshots taken in stepped mode then show real juice, and the sim stays deterministic.
- **Every game must have a hard ceiling** (a doom clock) so that even perfect play eventually ends. This is principle 10 ("not solved"), which bots with perfect reflexes would otherwise break.
- **2-player game (MAGSUMO):** solo play is a gauntlet against CPU opponents that get stronger, and a second human joins by pressing their keys. The bot API drives player 1 in gauntlet mode.
- **Word game dictionary:** embedded in the HTML from an MIT/public-domain word list, filtered to common words, so the file stays self-contained.

## D5. The bot metric saturated, so I added a graded v2 score (Phase 3)
- The v1 threshold signals (`lab/run.js`) gave **all 10 games 10/10**. Every builder was handed the thresholds and tuned to them, which is Goodhart's law in miniature. A metric everyone passes ranks nothing.
- `lab/botscore.js` (v2) scores the **same FUN.md principles** on continuous scales:
  - skill gap: log10 of the smart/random median ratio, with full credit at about 30×;
  - mastery slope: where the heuristic bot sits on the log ladder between random and smart, where 0.3–0.7 counts as smooth;
  - pacing band: 90–240 s;
  - variety: smart-bot score CV, with full credit at 0.4;
  - reward cadence: the median longest scoreless gap;
  - a half-weight "flail ratio": random-bot session length divided by smart-bot length. Instant death is harsh, and immortal flailing means no agency.
- The ranking uses v2. v1 stays as the pass/fail gate.

## D6. "My score" is my felt score, not my rubric tally
- I scored my own play both ways (`lab/notes/mine-scores.json`). My rubric tallies came out 7.7–9.7, about 1.5 points above my gut on every game. The rubric checks that the *structures* of fun are present, and most games have them. It can't tell a game I loved from a game I merely respected.
- The critic already scores strictly against the rubric. So, to avoid double-counting the rubric, the ranking uses my gut score (1–10, recorded *before* I saw the critic's numbers). The rubric tallies are reported alongside.

## D7. Fun scores keep one decimal
- FUN.md says `round(total/3)`. With 10 games bunched at 7–9 that throws away the resolution needed to rank them, so all components keep one decimal.

## D8. Round-1 ranking, and which games get reworked or polished (Phase 4)
Provisional final = 0.30 × bot (v2, round-1 data) + 0.35 × blind critic + 0.35 × my gut:

| Game | bot | critic | mine | final |
|---|---|---|---|---|
| LOOPBACK | 9.2 | 10 | 8.0 | 9.06 |
| PIPWALK | 9.5 | 10 | 7.5 | 8.98 |
| SPELLSNAKE | 9.1 | 9 | 8.5 | 8.86 |
| MAZEWRIGHT | 8.3 | 10 | 8.0 | 8.79 |
| TILTWELL | 8.3 | 9 | 7.0 | 8.09 |
| UPTEMPO | 7.6 | 9 | 7.0 | 7.88 |
| COMPOUND | 9.1 | 8 | 6.5 | 7.81 |
| KICKBACK | 9.5 | 8 | 5.5 | 7.58 |
| MAGSUMO | 9.1 | 7 | 6.5 | 7.46 |
| JUNK ORBIT | 9.3 | 6 | 7.0 | 7.34 |

- **Bottom 3, reworked hard:**
  - JUNK ORBIT: blind spam ≈ deliberate play. The economy was reworked so misses become the danger and the streak rewards accuracy.
  - MAGSUMO: deliberate play ≈ random, and there was no forgiveness. The on-ramp, edge grace, force readability and the teaching CPU ladder were reworked.
  - KICKBACK: everyone died in under 10 s. The on-ramp was reworked: eased turn, drift arrow, gentle waves, a rim shield.
- **Also reworked: COMPOUND (4th from bottom).** The critic and I independently found the same flaw: mashing survives as long as careful play, and the score doesn't track what you see. Two independent sources plus the bot data (heuristic ≈ random) were enough to act on.
- **Top 3, polished:**
  - LOOPBACK: teach PHASE, kinder pickup, clutter fading.
  - PIPWALK: legibility of chain breaks, dodges and the TOP face.
  - SPELLSNAKE: gentle opening with a starter word, visible grace, rules on screen.
  - MAZEWRIGHT (a close 4th) also got its friction fixes.
- **Every bug the critic found was fixed in every game.** TILTWELL: Up spent a tilt, and taps were dropped. UPTEMPO: the start key braked. MAZEWRIGHT: digit picks and dropped cursor presses. COMPOUND: unreadable numbers. PIPWALK: preview pips were misread.
- **Round 2:** a fresh blind critic (it hasn't seen the round-1 notes) replays the reworked bottom 4 and the polished top 3. The full bot lab re-runs on all 10 as `v2`.

## D9. "The first screen isn't the board you play" was a tool artifact
- The critic reported that in 4 games the opening layout changed after the first key. I checked in real-time human mode: pressing a key only advances the game, and the tiles, stars, poles and CPU stay identical (`lab/notes/mine.md`). What happened is that `lab/play.js` took its first-look screenshot under the page's own random seed, then called `reset(seed)`.
- The fix: `/open` now returns both `firstLook` (the human first impression) and `startFrame` (the seeded board you play), with a note explaining the difference. The finding is excluded from game scoring.

## D10. Round 2 measurement plan (Phase 4)
- **Bots:** the whole lab re-runs on all 10 games (`--tag v2`, 50 seeds × 3 bots). v1 results are kept for before/after comparison.
- **Critic:** a *fresh* blind critic (no access to round-1 notes) replays the 7 changed games: the 4 reworked (JUNK ORBIT, MAGSUMO, COMPOUND, KICKBACK) and the 3 polished (LOOPBACK, PIPWALK, SPELLSNAKE). It has a 15-screenshot budget per game. The round-1 critic overspent and finished runs with blind loops, which muddied its evidence.
- **The 3 games with only bug fixes keep their round-1 critic score:** MAZEWRIGHT, TILTWELL, UPTEMPO. Their fixes removed specific friction the critic named, so their round-1 critic score is if anything conservative. I accept that asymmetry rather than spend another ~1 hour of critic time.
- **Critic scores used in the final ranking:** round 2 where it exists, otherwise round 1. Both are reported.
- **"Mine":** my post-change gut score (`gut2`) where I re-played, otherwise my round-1 gut. Both are reported.

## D11. Final fixes after critic round 2, and the final measurement
- **Small friction fixes from the fresh critic:**
  - LOOPBACK: grace after phasing a ghost.
  - COMPOUND: builds at the advertised ★ cell.
  - SPELLSNAKE: says why a cast became a SPIT, and the suggestion tracks your progress.
  - MAGSUMO: correct ring-out attribution.
  - KICKBACK: POINT-BLANK and RIM SKIM taught in play.
- These five games were re-measured (50 seeds × 3 bots) so the published v2 data matches the shipped builds exactly. `lab/runall.js --aggregate-only` rebuilds the 10-game summary.
- The round-2 critic scored builds from *before* these fixes. I did not run a third critic pass: the fixes address that critic's own complaints, so its scores are, if anything, conservative.
- PIPWALK's arrow keys navigating the upgrade draft was **not** changed. Arrows only move the highlight and never pick or roll, so moves queued at floor-clear are simply dropped, which is harmless.

## D12. Choosing the winner
- PIPWALK has the highest final score (0.30 bot + 0.35 critic + 0.35 me). It is also the only game that every judge places at or near the top: a graded bot score of 10.0, 10/10 from both independent blind critics, and 8.5 from me.
- **Sensitivity check:** PIPWALK is 1st under 6 of the 7 weightings tested, including the official one (see REPORT.md). The exception is "my score only", which favours SPELLSNAKE (9.0 vs 8.5). I didn't let my own favourite override two blind judges and the bots.

## D13. New bot tiers: masher and human-model (follow-up "what I'd build next" #2)
- **Masher family** (`lab/tiers.js`): bots that never read game state. There is one strategy per action name: "hold or mash X forever", falling back to the first offered button when X isn't available, so menus still advance. A "cycle every button" strategy is added on top. The **best masher** is the spam-exploit detector. If it beats the rule-of-thumb heuristic bot, mindless input outplays a simple deliberate player.
- **Human model**: each game's own bot, wrapped in human limits that depend on the kind of game:
  - real-time games: decides from a 100 ms-old snapshot, at most one decision per 100 ms, 3% slips;
  - rhythm: no perception delay (players anticipate the beat), but 0–33 ms execution jitter and 3% wrong-lane slips;
  - turn-based: no delay, ≥400 ms of "thinking" per move, 3% slips.
- **Calibration I rejected:** the first version used 160 ms latency with a 120 ms decision step, which works out to ~240 ms of staleness. It scored *below the masher* in LOOPBACK, which contradicts both blind critics' deliberate play, so I treated it as miscalibrated. Anticipatory tracking (dodging and aiming at things you can see coming) runs well under simple reaction time.
- **Human estimate = the better of wrapped-smart and wrapped-heuristic.** Wrapping only the smart bot was too pessimistic. Its lookahead threads gaps tighter than its own latency allows, and its aim overshoots. Real players adapt their margins to their limits, so picking the better of the two limited bots is a fairer stand-in.
- **What these tiers can't do:** they model reflexes, not perception, learning or feel. They are a cheap screen for exploits and difficulty, not a replacement for humans. That is what the playtest kit (D14) is for.

## D14. Human playtest kit and audio lab (follow-up #3: "real people at real keyboards, with sound")
- **I can't recruit people,** so I built the two things that make a human study possible and cheap:
  1. **Playtest artifact** (`lab/playtest/index.html`, published privately).
     - It shows a sound-check gate, then five games in random order: KICKBACK, MAGSUMO, UPTEMPO and SPELLSNAKE are the four where the AI critics were least reliable, and PIPWALK is a control.
     - Each game embeds the real file. The page records every run (score, length, cause, inputs, device) from the game's own `__game` API and asks five questions: fun 1–10, fairness 1–5, controls 1–5, sound, and "another go?".
     - Data goes to the artifact's `db`. Rules: each tester reads and writes only their own record (`testers/{self}`), and only the owner sees everyone's (`testers` read `admin`, write `owner`). I verified that the owner sees a probe record and a contributor-level viewer sees nothing.
     - The owner gets a live results table, including a per-tester "learning ×" (3rd run ÷ 1st), which is the floor-steepness measure the bots can't give.
  2. **Audio lab** (`lab/audio.js`). It injects a recorder tap on every connection to `AudioContext.destination` and plays each game in real time with real keys. It measures peak, RMS, clipping, silence, onsets, DC and NaN, and UPTEMPO's kick-versus-beat offset. It also writes a WAV and a waveform/spectrogram PNG per game.
- **Audio lab findings, all fixed:**
  - **UPTEMPO kick ~22 ms late, with a random per-session phase.** Causes: compressor look-ahead (~6 ms), a one-shot clock anchor, and an assumed rather than measured output latency. Fix: a zero-latency soft-clipper, plus continuous `getOutputTimestamp` mapping. Now median 0.0 ms, p95 ≤ 7 ms across 3 runs, and drift < 1.3 ms/min even under −1601 ppm clock skew.
  - **19 dB loudness spread across the arcade.** JUNK ORBIT and SPELLSNAKE were barely audible next to UPTEMPO. Fix: a per-game output trim targeting −30 dBFS active RMS, with peaks capped at −3 dBFS. Now ~2 dB spread, 0 clipping.
- **The audio lab still can't tell whether a sound is *good*.** That stays a question for humans, and it's why the playtest asks "did the sound make it better?".
