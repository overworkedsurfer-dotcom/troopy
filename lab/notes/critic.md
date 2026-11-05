# Blind critic notes

Critic played each game blind (no code, briefs or decisions read), only through the stepped play server
(`lab/play.js`, port 8811), and scored it against `research/FUN.md`. Audio isn't scored. Stepped mode means
I play in discrete slices of 25–600 ms with screenshots, so a fast twitch game is a bit harder for me than for
a human on a keyboard. I note that where it matters.

---

## 1. Kickback

**What it is (as I understood it):** You're a ship in a circular arena with an electric rim. Left/right rotate,
Space fires, and every shot's recoil is your only propulsion. Break rocks, which split into smaller rocks, and
build a CHAIN. Skimming close to the rim raises a ×mult, but touching it kills you.

**Runs**
| Run | Seed | Score | Length | Cause | 
|---|---|---|---|---|
| 1 | 101 | 327 | ~7 s | fried on the electric rim |
| 2 | 102 | 113 | ~7 s | fried on the electric rim |
| 3 | 103 | 310 | ~6 s | fried on the electric rim |

Improved? **No** (327 → 113 → 310). I understood the physics better each run (shots that target a rock push
you toward the opposite rim, so you have to plan counter-shots), but every run ended the same way: drifting
into the rim during the roughly 0.6 s it takes to turn 180°. I never saw wave 2.

| # | Principle | Score | Justification |
|---|---|---|---|
| 1 | Readable in 5 s | 2 | The first screen shows the controls line, "press any key / tap to start", and a ship sitting in the arena. I was firing within a second. |
| 2 | Clear goal, visible score | 2 | Score, best, ×mult, chain and wave are always on screen. Goal in one sentence: "break rocks with recoil-shots without touching the rim". |
| 3 | Juicy feedback | 2 | Hits flash white. Kills burst into particles with a shockwave ring and floating +N text, and a CHAIN ×N banner pops. The rim crackles with lightning when you skim it, and death flashes the whole screen red. There's apparent hitstop too: sim time stalls briefly on kills. |
| 4 | Forgiving input | 1 | A shaded "skim band" warns you before the rim, but there's no friction or auto-brake, and the turn rate is slow compared with how fast you drift. Two of my three deaths came mid-turn while I was trying to brake. |
| 5 | Fair, legible failure | 2 | "fried on the electric rim" is named every time, with wave, kills, point-blank count and peak ×mult. I could explain each death. |
| 6 | Instant retry | 2 | Any key restarts. Play resumed about 0.3 s after game over. |
| 7 | Interesting decisions | 2 | Every shot is a movement decision. Which rock you shoot decides where you get pushed, so target choice really matters. |
| 8 | Pattern to learn | 1 | There's an obvious skill to learn (counter-shooting to brake, shooting from where you want to drift), but my scores didn't climb over 3 runs. It feels like a cliff at the start. |
| 9 | Escalation / flow | 0 | There's a wave counter, but at my skill the opening alone ends runs in about 7 s. I never saw a difficulty increase, and sessions were nowhere near 60 s. |
| 10 | Not solved | 2 | Nowhere near solvable. Drift keeps every moment live. |
| 11 | Risk and reward | 2 | Rim skimming for ×mult is a textbook greed-kills tension (my peak was ×1.4 right before death). "Point-blank" kills also look like a bonus for closing in on rocks. |
| 12 | Few verbs, deep use | 2 | Three inputs. Fire is your weapon, your engine and your brake. |
| 13 | Variety | 1 | Rocks come from different edges on each seed, with a warning arc and arrow, but the first 7 s of each run felt similar. |
| 14 | Reward cadence / compounding | 2 | Points arrive every second or two while shooting. Chain ×N multiplies kills (+20 → +60 → +150 → +80), on top of the skim ×mult. |
| 15 | One more go | 2 | Best and NEW BEST are shown at game over, with a stats line. I wanted to try again right away, because I felt I was one insight away from surviving. |

**Total: 25 / 30 → Fun score 8**

- **MDA aesthetic felt:** Challenge (with strong Sensation).
- **Best moment:** Shooting a rock into a CHAIN ×4 (+80, +150) while recoil carried me across the arena felt like pool-shark physics.
- **Worst moment:** Turning 180° to brake, then dying on the rim mid-turn before I could fire. The turn rate was the real enemy.
- **Would I play a 4th run?** Yes. The loop is tight and the restart is instant, and I want to learn to "orbit" the rim on purpose.
- **Bugs / friction:** No console errors. The game-over text fades in over the red flash and is briefly hard to read (fine after about 0.8 s). The ship sprite's facing is ambiguous at small size: the notched arrowhead sometimes reads as pointing the wrong way, and I had to rely on the dotted aim line. Runs are very short for a new player. A little drag/friction, or a faster turn, would widen the on-ramp a lot.

---

## 2. Loopback

**What it is:** You're a dot in a box. Every ~8 s (the interval shortens later) a numbered ghost of yourself
spawns at the start point and replays your exact path from the beginning, dashes included. Touch a ghost and
you die. Collect green orbs (an ORB CHAIN ×N builds if you grab them quickly) and rarer gold orbs (GOLD ×3).
"Brushing" close past a ghost raises a ×mult, and dashing *through* a ghost is a "PHASE!" bonus. Around 73 s,
"THE LOOP TIGHTENS — the walls are closing in" and the arena starts to shrink.

**Runs**
| Run | Seed | Score | Length | Cause |
|---|---|---|---|---|
| 1 | 101 | 216 | 16 s | hit by ghost #1 (you, 8s ago) |
| 2 | 102 | 3,789 | 88 s | hit by ghost #11 (you, 79s ago) |

Improved? **Yes, hugely** (216 → 3,789). Run 1 taught me the rule ("the ghost is me N seconds ago, dash
speed and all"). In run 2 I planned routes around my own history, used the dotted "future path" lines, and
found that dashing through ghosts is rewarded. I didn't play a 3rd run on screenshot budget, but the learning
curve was obvious.

| # | Principle | Score | Justification |
|---|---|---|---|
| 1 | Readable in 5 s | 2 | The first screen says "ARROWS/WASD move · SPACE dash", marks the ghost spawn ("your ghost appears here and replays this path"), and says "press any key". I moved instantly. |
| 2 | Clear goal, visible score | 2 | Score, best, dash cooldown, brush ×mult, ORB CHAIN, ghost count and "next 6.2s" are always visible. Goal: "grab orbs without touching your past selves". |
| 3 | Juicy feedback | 2 | Orb pickups burst with a ring, particles and floating +N. Ghost spawns get a countdown ring, a big "GHOST #N" banner, a screen tint and "SURVIVED +N". PHASE and BRUSH get pink floating text, the arena border goes red on "THE LOOP TIGHTENS", and death zooms in rings on the ghost that got you. |
| 4 | Forgiving input | 2 | Dash-through-ghost (phase) is a real escape hatch. Each ghost shows its upcoming path as a dotted line, and ghosts that replay positions now outside the shrunken arena go dormant. Orb pickup radius is a bit stingy: I slid past one orb and lost a chain. |
| 5 | Fair, legible failure | 2 | "hit by ghost #11 (you, 79s ago)" is the best death message in the set. It names *which past you* killed you and *when*. |
| 6 | Instant retry | 2 | Any key or tap retries. The game-over screen has a full stats line (survived, ghosts, orbs, brushes, phases, peak ×). |
| 7 | Interesting decisions | 2 | Every move is a commitment that comes back later. Orbs tend to spawn near ghost lanes, so you're always weighing a greedy route against a safe one. Corners are "safe now, deadly in 8 s". |
| 8 | Pattern to learn | 2 | A clean learning slope: run 1 I misjudged a replayed dash, and by run 2 I was predicting ghost positions from my own timeline. 17× improvement. |
| 9 | Escalation / flow | 2 | Ghosts keep stacking (11 by 80 s), spawn intervals shorten, and at ~73 s the walls start closing in. My 88 s run sat squarely in the 60–300 s window. |
| 10 | Not solved | 2 | Ghost density plus a shrinking arena guarantees an end. No safe loop exists, because any periodic path collides with its own ghosts. |
| 11 | Risk and reward | 2 | Three overlapping tensions: brush (pass close for ×mult up to ×2.0), phase (dash *into* a ghost for +96/+120), and orbs placed in ghost traffic. Greed visibly pays and visibly kills. |
| 12 | Few verbs, deep use | 2 | Move plus dash. Dash is mobility, invulnerable phase, *and* a scoring move. And every movement is also "level design" for your future self. |
| 13 | Variety | 2 | The start point and orb spawns differ by seed, but the real variety is that your own path *is* the level, so no two runs can match. |
| 14 | Reward cadence / compounding | 2 | Something pays every 1–3 s: orbs, survive bonuses (+10 → +80, growing per ghost), gold, phase. Orb chain × brush mult × gold ×3 multiply (+431 for one gold). |
| 15 | One more go | 2 | Best and NEW BEST at game over, plus a stats line. I really wanted another go to play the phase mechanic aggressively. |

**Total: 30 / 30 → Fun score 10**

- **MDA aesthetic felt:** Challenge, with a lot of Discovery (learning your own past as a puzzle).
- **Best moment:** Dashing straight through ghost #2 for "PHASE! +120" and watching the mult jump to ×2.0, turning an unavoidable death into a payout.
- **Worst moment:** Run 1's death, where the ghost replayed a dash I'd forgotten and closed a gap faster than walking speed. It's fair in hindsight, but it surprised me.
- **Would I play a 4th run?** Yes, immediately. It's the most "I can do better" game here.
- **Bugs / friction:** No console errors. Movement has a short acceleration ramp, so tiny taps travel less than expected, which made precise orb pickups fiddly in stepped mode. Late game (8+ ghosts) gets visually busy: the numbered rings help, but trails overlap a lot. The "phase" mechanic isn't explained on screen. I found it by accident from the "0 phases" stat on the first game-over screen. Ghosts that replay positions outside the shrunken arena are drawn faded, which is a nice touch but not explained.

---

## 3. Tiltwell

**What it is:** A Puyo-style 8×8 well. Coloured pairs (vertical or horizontal, no rotation) drop in. Match 4+
of a colour, each colour with its own shape icon. **Q/E rotate the whole well 90°** so gravity re-settles
everything, which can set up pops and chains. You have 3 tilt charges, and popping recharges them. Grey stones
rise from marked columns every N drops ("▲2 in 7"), and chains "block" stones. Levels speed things up and add
stones.

**Runs**
| Run | Seed | Score | Length | Cause |
|---|---|---|---|---|
| 1 | 101 | 433 | ~49 s | the well overflowed — no room for the next piece |
| 2 | 102 | 690 | ~53 s | the well overflowed — no room for the next piece |

Improved? **Somewhat** (433 → 690). To stay on the screenshot budget, I played the first ~10 pieces of each run
deliberately and finished both runs with a blind "spread the drops" pattern, so the end scores are noisy. The
deliberate parts clearly got better: in run 2 I predicted a Q-tilt exactly, and it lined up three blues for a
pop on the next drop.

| # | Principle | Score | Justification |
|---|---|---|---|
| 1 | Readable in 5 s | 2 | The controls line, rules line, a ghost landing preview, NEXT, TILTS and STONES are all on the first screen, with no menu. Dropping a piece is obvious. |
| 2 | Clear goal, visible score | 2 | Score, level and best are always shown. Goal: "match 4+ of a colour, keep the well from spilling". |
| 3 | Juicy feedback | 2 | Pops burst into particles with floating +N. "CHAIN ×2!" fills the board, and the HUD flashes "+1 TILT!" and "BLOCKED −1". The whole well physically rotates on a tilt, and level-ups get a banner ("faster · more stones"). |
| 4 | Forgiving input | 1 | The dashed ghost landing preview is real assistance. But **ArrowUp silently triggers a tilt**: my first two "rotate?" presses burned 2 of 3 tilts, and the first one, on an empty well, gave no visible feedback. A couple of quick left/right taps were also dropped, so pieces landed one column off. |
| 5 | Fair, legible failure | 2 | "WELL SPILLED — the well overflowed — no room for the next piece", plus level, longest chain and stones broken. |
| 6 | Instant retry | 2 | "press any key to tilt again". |
| 7 | Interesting decisions | 2 | Tilting is a big, legible decision. You can predict the re-settle (I did, exactly), and it trades a scarce charge for a board reshuffle. "Spend a tilt now vs. save it" is a real choice. |
| 8 | Pattern to learn | 1 | There's a clear learnable layer on top of basic matching: predicting where columns end up after a tilt. My score improved, but the blind tails make that weak evidence. |
| 9 | Escalation / flow | 2 | Levels arrive quickly (level 3 by ~45 s). Each one is faster, and stones go from "2 in 7" to "3 in 2". |
| 10 | Not solved | 2 | Rising stones and speed-ups guarantee pressure. |
| 11 | Risk and reward | 1 | Holding colours for a bigger chain (which also blocks stones) against the well filling up is the classic Puyo tension. It's present, but in my short runs it never felt sharp. Saving tilts versus spending them is the more interesting gamble. |
| 12 | Few verbs, deep use | 2 | Move, drop and tilt. Tilt is both your combo setup and your emergency exit, and popping both scores and recharges tilts. |
| 13 | Variety | 2 | Seeds change the piece order and which columns get stones (0/4 vs 0/1), and one tilt makes the board look completely different. |
| 14 | Reward cadence / compounding | 2 | A pop every 2–3 drops if you plan, and chains multiply (+40 → CHAIN ×2 +130). |
| 15 | One more go | 2 | Best and NEW BEST are shown, and the restart prompt is thematic. I'd happily replay to land a 3-chain off a tilt. |

**Total: 27 / 30 → Fun score 9**

- **MDA aesthetic felt:** Challenge (puzzle), with Discovery in learning how tilts re-settle.
- **Best moment:** Predicting a counter-clockwise tilt, watching three scattered blues slide into a row exactly as planned, then finishing them with the next drop.
- **Worst moment:** Learning that ArrowUp spends a tilt. I lost two of my three charges in the first second without knowing why the TILTS meter had emptied.
- **Would I play a 4th run?** Yes. The tilt is a fresh twist on a familiar genre, and I want to try chaining off a tilt on purpose.
- **Bugs / friction:** No console errors. ArrowUp maps to tilt but isn't shown in the controls line. Pieces fall on their own (gravity), which isn't obvious until level 2 speeds it up. The LEVEL 2 banner briefly covers the middle of the board while a piece is falling. The first-look screen showed a different starting pair (red/green) than the one I actually got after my first keypress (red/red), which is a little disorienting.

---

## 4. Spellsnake

**What it is:** Snake where the food is Scrabble tiles. The letters you eat line up in your body, and the HUD
reads them as a word. When the body forms a valid word, it glows gold ("WORD!") and SPACE casts it for points
(more letters, much more points). If it isn't a word, SPACE spits your last letter out, and it becomes a rock
obstacle. Ringed tiles "finish a word". A fuse bar runs down while you carry letters, and it ends in "starving".

**Runs**
| Run | Seed | Score | Length | Cause |
|---|---|---|---|---|
| 1 | 101 | 0 | 2.6 s | crashed into the wall |
| 2 | 102 | 400 | 16.6 s | crashed into the wall (after casting ARC +50 and MEANS +350) |
| 3 | 103 | 0 | 17 s | crashed into a rock while starving (blind probe of the fuse) |

Improved? **Yes, from run 1 to run 2** (0 → 400). Run 3 was a deliberate blind loop to see what the fuse does,
not a skill attempt. Most of my learning was about the snake's speed (~4–5 cells/s, much faster than I
assumed) and turn timing. The word game on top was immediately fun.

| # | Principle | Score | Justification |
|---|---|---|---|
| 1 | Readable in 5 s | 2 | "YOUR BODY IS THE WORD — press an arrow key to start", with controls and rules under the board. The HUD's contextual hint is excellent ("no word yet · SPACE spits the S (it becomes a rock)" → "SPACE casts ARC for +50"). |
| 2 | Clear goal, visible score | 2 | Score, level, combo and best are always shown, plus a live word tray. Goal: "eat letters in an order that spells a word, then cast it". |
| 3 | Juicy feedback | 2 | A valid word lights the tray and body gold with a "WORD!" pop. Casting gives a huge "ARC! +50 / 3 letters ×1" and the letters fly off the snake, with particles on every eat. Ringed tiles pulse, and the board border turns red when you near a wall. |
| 4 | Forgiving input | 1 | Turns seem to queue for the next cell (a form of buffering), and the red-border warning helps. But the snake is fast and turns are cell-quantised, so I overshot target tiles three times, ate letters I didn't want (A-O, A-R-U), and hit a wall twice. |
| 5 | Fair, legible failure | 1 | "crashed into the wall" is clear. "crashed into a rock while starving" isn't: nothing explained what starving was or where that rock came from. |
| 6 | Instant retry | 2 | "press any key to slither again". |
| 7 | Interesting decisions | 2 | Route planning *is* spelling. Which letter to take next, whether to spit (which leaves a permanent rock), and whether to detour for a ringed letter are all real choices. |
| 8 | Pattern to learn | 1 | Improvement came mainly from learning the speed. There's clearly a deep layer (vocabulary plus routing), but the controls are a steep first cliff. |
| 9 | Escalation / flow | 1 | Combo climbs (×1.25 after one word), and spat letters become permanent rocks that clutter the board. I never reached level 2, so I couldn't see the main difficulty ramp. |
| 10 | Not solved | 2 | Rocks accumulate and the fuse forces commitment. There's no safe idle strategy (my blind loop starved). |
| 11 | Risk and reward | 2 | The best tension in the set so far. "SPACE casts MEAN for +150", with a ringed S eight cells away while the fuse burns, and taking the detour made it **MEANS for +350**. |
| 12 | Few verbs, deep use | 2 | Four turns and one action. SPACE is both cast and spit, and your body is your word, your score and your hazard at once. |
| 13 | Variety | 2 | Every seed deals completely different letters, so the possible words differ each run. |
| 14 | Reward cadence / compounding | 2 | Length scales steeply (3 letters 50, 4 letters 150, 5 letters 350), and the combo multiplier carries between words. |
| 15 | One more go | 2 | Best is shown at game over. The MEANS cash-in made me want another go right away. |

**Total: 26 / 30 → Fun score 9**

- **MDA aesthetic felt:** Challenge, with Expression (you choose which word to make).
- **Best moment:** Seeing the tray read "MEAN +150", gambling on the ringed S, and getting "WORD! 5 — MEANS +350" just before the fuse ran out.
- **Worst moment:** Overshooting an A by one cell, eating an O I didn't want, and being stuck with the non-word "AO" while heading for a wall.
- **Would I play a 4th run?** Yes. The Snake + Scrabble fusion is genuinely clever, and I want to plan a 6-letter word.
- **Bugs / friction:** No console errors. The first-look screenshot showed a different letter layout than the one actually dealt after my first keypress. Two-letter words like "AS" don't count, and nothing says the minimum is 3. Spat letters fly to a seemingly random spot before becoming rocks (one landed far across the board), which is hard to track. "Starving" is never explained. Speed is high for a first-time player, so the first 30 seconds are mostly wall deaths.

---

## 5. Pipwalk

**What it is:** A turn-based roguelite on a 7×7 tray. You're a die. Each arrow press *rolls* the die one cell,
which changes its top face, and the four neighbouring faces are previewed around it. Bumping a foe hits it
for your TOP face's value without rolling. Hitting with rising or equal faces builds a CHAIN/MATCH ×mult.
Clear the tray to pick one of three upgrades (Twin Fangs, Glass Cannon, Vampire Pips, Quake Face, Heart Face,
and so on). A DREAD meter counts turns until an unkillable-feeling Dread spawns, and kills push it back.

**Runs**
| Run | Seed | Score | Length | Cause |
|---|---|---|---|---|
| 1 | 101 | 870 | ~45 s (≈50 turns) | Devoured by the Dread on floor 4 |
| 2 | 102 | 659 | ~50 s | Devoured by the Dread on floor 4 |

Improved? **No** (870 → 659). Run 1 had a lucky build: Twin Fangs + Glass Cannon, then three matching 5-hits
for MATCH ×5 and a +530 burst. Run 2 offered sustain upgrades instead. In both runs I played floors 1–3 by
hand and then (to save screenshots) ran floor 4 with a blind rocking pattern, which can't kill floor-4 foes
(14 HP skulls, a 34 HP elite). So floor 4 was the wall both times.

| # | Principle | Score | Justification |
|---|---|---|---|
| 1 | Readable in 5 s | 2 | "Arrows/WASD roll · bump a foe to hit it with your TOP face" is on screen, with face previews around the die. My first input was meaningful. The die-roll mental model takes a minute, but the previews carry you. |
| 2 | Clear goal, visible score | 2 | Score, floor, best, HP, chain, LAST HITS, die net and dread are always visible. Goal: "clear each tray with chained hits before the Dread arrives". |
| 3 | Juicy feedback | 2 | Floating damage numbers, "KILL" previews, "PAIR ×3" banners, confetti and a "FLOOR 1 CLEAR / chain ×2 +60" banner on clears, a red-flash "CHAIN BROKEN -2" on taking damage, and the die visibly tumbling. Only the "dodged" tag was confusing. |
| 4 | Forgiving input | 2 | Turn-based, with full information. Each foe shows a pre-hit preview ("⚔5 KILL" or "⚔5 push", plus incoming damage). There's no twitch, so every mistake is a planning mistake. |
| 5 | Fair, legible failure | 2 | "THE DIE IS CAST — Devoured by the Dread on floor 4", with floor, kills, best hit and top mult. The dread bar warned me for 14 turns. |
| 6 | Instant retry | 2 | "press any key to roll again". |
| 7 | Interesting decisions | 2 | Every move both repositions you and picks your next attack value, and you can see your neighbour faces. Choosing between "roll to set up a 6, or bump now with a 5" is a real puzzle, and upgrades are a 1-of-3 build choice. |
| 8 | Pattern to learn | 1 | I learned to wait in place (rock back and forth) so foes come to me, and to line up equal faces for MATCH. Score didn't improve, because upgrade luck dominated across my two runs. |
| 9 | Escalation / flow | 2 | Foe HP climbs fast by floor (3 → 5 → 8–10 → 14 and a 34-HP elite), and the Dread timer forces tempo. |
| 10 | Not solved | 2 | Foe scaling plus the Dread means a static strategy dies. |
| 11 | Risk and reward | 2 | "Glass Cannon: ALL damage ×2, Max HP −3. Greed is good?" names the tension outright. Holding a chain against taking a hit is another one. |
| 12 | Few verbs, deep use | 2 | Four arrows. Each roll is movement, weapon selection *and* a turn tick, and a bump is an attack that also keeps your face. A textbook dual-purpose verb. |
| 13 | Variety | 2 | Foe layouts and the upgrade draft differ by seed. Run 1 went glass-cannon match build, run 2 went sustain. |
| 14 | Reward cadence / compounding | 2 | A kill every few turns, an upgrade every floor (~15 s), and MATCH multipliers that stack with Twin Fangs (×2 → ×3 → ×5) and Glass Cannon ×2. Real Balatro-style multiplication. |
| 15 | One more go | 2 | Best and NEW BEST are shown. I wanted to try a dedicated Quake Face / Even Keel build. |

**Total: 29 / 30 → Fun score 10**

- **MDA aesthetic felt:** Challenge (tactical puzzle), with Expression through the build draft.
- **Best moment:** Glass Cannon + Twin Fangs, then three straight 5-face hits: "PAIR ×3", then MATCH ×5 and +530 in one bump. The numbers went up absurdly.
- **Worst moment:** Floor 4's wall of 14-HP skulls and a 34-HP elite when my build had no damage scaling. Two of the three upgrade cards in run 2 were defensive.
- **Would I play a 4th run?** Yes. This is the deepest game in the set, and the draft means each run feels different.
- **Bugs / friction:** No console errors. When a foe moved into the cell I was rolling toward, my roll became a bump (useful but surprising). Several times one of two consecutive bumps didn't count toward LAST HITS, I think because taking damage silently resets the chain. "dodged" floats over the die with no explanation. Space does nothing during play (I tried it as a "wait"). The face-net in "YOUR DIE" (top/under) is hard to read at a glance. The FLOOR 1 banner covers the die on the opening turn.

