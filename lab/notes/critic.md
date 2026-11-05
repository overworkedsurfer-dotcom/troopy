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

