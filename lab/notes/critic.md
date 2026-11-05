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

