# My own play notes (Phase 3, round 1)

Played through `lab/play.js` (time-stepped, real key events, screenshots between moves).

## KICKBACK
- Run 1: 20 pts, 4.2 s, "fried on the electric rim". Run 2: 80 pts, 8.7 s, "clipped by a rock shard".
- **Felt good:** the first rock popping into a CHAIN ×2 with a big "+60". The twist reads instantly: I *knew* that firing at the rock would shove me backward, and I felt the dread of that.
- **Got bad:** it isn't boring, it's brutal. Within 4 s I'd drifted into the rim. Turning 180° to brake takes about 0.55 s, which is too long when drift is already carrying you toward the rim. There is no velocity indicator; the dotted line is aim, not motion, so it's hard to read where you're heading.
- Both deaths were legible, and the cause was printed.
- **Fix ideas:** gentler wave 1 (fewer and slower rocks), a velocity arrow, slightly more drag, and rotation that eases up faster.

## TILTWELL
- Run 1: 63 pts, 17 s (I deliberately spammed drops at the end to find the failure mode). The cause read "rising stones overflowed the well".
- **Felt good:** planning a 5-blue cluster across two pieces and watching it pop, with a white flash bloom and "+63". The board rotation looks great, and colour + icon cells are a nice accessibility touch.
- **Got bad:** I couldn't predict what a tilt would do. After my "rescue" tilt the board just reshuffled into a mess with no pop. Tilting feels like a gamble, not a decision. Pops also score small (+63) compared with bot medians of about 9k, so you only see the big numbers through chains you can't plan for.
- The HUD is excellent: NEXT, TILTS charges, and a "STONES 2 in 7" countdown. The danger tint on the top row reads well.
- **Fix ideas:** a tilt preview (ghost of the post-tilt settle) while hovering or holding Q/E. Bigger, punchier numbers on the first pop.

## SPELLSNAKE
- Run 1, about 13 s in: spelled S-O-L, accidentally ate C before D ("SOLCD"), spat both, went up to E for SOLE (+80 offered), then *chose greed* and looped down to a ringed S for SOLES (+200). Cast it.
- **Felt good:** the SOLE → SOLES decision is a real, felt risk/reward choice. The cast is a proper jackpot: letters peel off the body and fly away, "SOLES! +200, 5 letters ×4", the combo ticks to ×1.25, and the snake shrinks. Ringed tiles ("this letter finishes a word") are brilliant scaffolding, so you never need to know the dictionary. The word panel ("SPACE casts SOLE for +80") is crystal clear.
- **Got bad:** eating the wrong letter because two tiles sit adjacent in your path (C, D) feels slightly cheap. It was my fault, but spitting costs two rocks. Early on there's a lot of dead travel time across a 13×15 board at 200 ms/cell.
- **Fix ideas:** slightly faster early pace, or more letters on the board early, so the first word lands within about 8 s.

## LOOPBACK
- Run 1: 256 pts, 29 s. The cause read "hit by ghost #2 (you, 16s ago)", after I made three moves without looking. That's entirely my fault, and the game *told me so*.
- **Felt good:** the concept groks in one ghost. The dotted line of your own path, the countdown ring "#2 0.9" at the spawn point, and seeing ghost #1 trace my exact opening moves is a genuinely new feeling. I brushed ghost #1 by accident and got "BRUSH ×1.2". A gold ×3 orb spawned right next to the ghost spawn point, which is a perfect risk/reward lure. The death screen naming *which past self* killed you is the best game-over text in the set.
- **Got boring:** the first ~15 s are sparse, with one orb at a time and long walks between them. With only 1–2 ghosts there's no pressure yet. The good part starts around ghost 3.
- **Fix ideas:** spawn 2 orbs early, make the first ghost come at 5 s rather than 8 s, or start the ghost interval shorter and ramp from there.

## UPTEMPO
- Run 1: 21 pts in 9 s. I hit 5 notes (1 PERFECT, 4 GOOD), then deliberately let notes pass to test punishment. Cause: "missed a trill at 82 BPM — out of HP" after 13 misses in about 5 s.
- **Felt good:** the synthwave look (sun, grid, a speedometer whose needle sits in a CRUISE band) is the most striking in the set. The per-seed song title ("NEON PULSE", "STREAM MIX") is charming. The feedback is excellent: PERFECT/GOOD with **early/late** tags, the lane flash, "+9", combo pips, and the floating "−3 BPM" on a miss. You can *see* the DDA twist working.
- **Got bad:** stepped play can't judge rhythm feel, and I can't hear the audio headless, which is the whole point of a rhythm game. I'm uncertain here and will lean on the critic and the bots. Perspective scroll makes note timing harder to read at the start, when notes are tiny.
- **Fix ideas:** none of substance from this run. Watch whether the brake is ever used (the bots show 0 brakes in my run).

## COMPOUND
- Run 1: score 300, lasted 83 s. I made about 10 buys, then went idle on purpose from 35 s. Cause: "the tide (+12.2%/s) outgrew your engine (+2.28%/s) at 1:23". That's precise, almost a lesson.
- **Felt good:** buying a ×2 COLUMN lens under three seeds. Wealth dropped (−$11, only ×1.39 above the tide), then a "GROWTH ×3.5" banner fired, and on the log chart my line swooped back up away from the tide. That dip-then-compound shape *is* the twist working: investment as risk/reward. The card preview "+5.29%/s here" updates with the cursor, so placement is a real spatial decision.
- **Got bad:** the cards show exact %/s deltas, which makes it a bit of a calculator: you pick the biggest green number. The SCORE (100·log10 wealth) creeps up 149 → 300, so the HUD's "number go up" is the wealth, not the score. After a few blind buys the 5×5 grid got visually busy (×2, ×4, ×0.5 badges everywhere).
- **Fix ideas:** make the score itself juicier (pop on milestones), and maybe hide the exact delta behind a hover so intuition matters.

## PIPWALK
- Run 1 (partial): cleared floor 1 in 4 moves (61 pts), picked "Odd Luck" (+2 on odd faces), and started floor 2 with a skull (HP 8) and two slimes (HP 4).
- **Felt good:** planning a roll so the 6 lands on top just as the slime steps adjacent, then the "⚔6 KILL" badge on the foe before I commit. Thinking two rolls ahead is the fun, and it's a novel kind of thinking: real die topology as a movement puzzle. After Odd Luck the 5 face became a big numeral **7** on the cube, which is a lovely "my die is changing" moment. The upgrade cards are clear, and confetti marks the floor clear.
- **Got bad:** the preview dice on neighbouring cells use pips, and at phone size I misread a 5 as a 3 once. Numerals on the previews would remove all doubt. The early floors are slow-ish for a human (a run would be 4–6 min).
- **Legibility is excellent otherwise:** foe intents ("1"), HP badges, DREAD countdown, "next ≥ 5 keeps it" chain hint, and the LAST HITS strip.

## MAZEWRIGHT
- Run 1: 1,618 pts, 56 s, wave 5. Cause: "a Swift broke the core on wave 5 (8 leaks this wave)". I built a 3-wall detour on wave 1 (path ×2), then tested pure greed: GO with all walls held (×4/×5 bank) every wave.
- **Felt good:** the live dashed path re-routing the moment I placed walls is instant comprehension, with a "×2" path bonus and an "undo" tag. "BANK IF YOU GO NOW ×4" is a beautifully legible temptation. Greed on wave 2 took me from 285 to 630 but cost 5 core HP, a real trade. "Glass Core (all damage ×1.8, core max −8, *risky*)" is a great Balatro-ish card.
- **Got bad:** during the wave you mostly watch. PULSE helps but it's a single press. Pure greed dies on wave 5, as it should, but I never had a mid-wave "save it" moment.
- **Overall:** clear, strategic, and the most "interesting decisions per minute" of the set so far.

## JUNK ORBIT
- Run 1: 6,480 pts, 73 s, level 4. Cause: "comet #32 came back around (fired 0:16 ago)", another lovely "your own history killed you" message. I aimed carefully for the first 3 shots, then spammed alternating aim + fire for the rest.
- **Felt good:** sweeping the aim left and watching the dotted preview bend *around* the planet and ring the far star, then "SLINGSHOT +200" and "×1.5 STREAK". The preview makes orbital mechanics feel learnable. The "captured = safe (blue) / loose = coming back! (orange)" legend is clear.
- **Got bad:** my first straight-up shot produced a radial orbit, a dot bobbing up and down through the planet. Two screenshots caught it at the apex, so it looked frozen. (Not a bug; I probed the state and it oscillates with a ~3 s period.) More importantly, **blind spamming scored 6.5k in 73 s**, which is roughly the random bot's median. Careless play is rewarded more than it should be, and by the end the screen is a tangle of orbits that's hard to read.
- **Fix ideas:** reduce the reward for unaimed volume (cooldown or streak decay on misses), and fade older captured orbits harder so the screen stays legible.

## MAGSUMO
- Run 1, round 1: I lost to "PEBBLE the Trickster (LV 1)" by ring-out in about 7.5 s, with 2 hearts left. I landed one MAGNET SLAM (+20) by attracting and then flipping at point-blank, but the Trickster flipped back and pulled itself in. Later it pulled *me* in and SLAMMED me to the edge, and the ice carried me out.
- **Felt good:** field lines that physically show attraction (blue loops) versus repulsion (red spokes) teach magnetism with zero text. The slam has real impact: pink flash, "MAGNET SLAM!" and "SLAMMED!". A CPU with a named personality that *used my own trick against me* was a great moment. The edge-danger red arc on the ring is readable.
- **Got bad:** ice momentum plus 4-way steering means I overshoot constantly. Round 1 against an LV 1 CPU should probably be winnable for a newcomer, and I lost it. The flip cooldown ("charging...") isn't visible on the puck itself, only in the corner HUD.
- **Fix ideas:** make the LV 1 CPU gentler (slower reaction, no slam-counter on round 1), add a cooldown ring on the puck, and slightly more traction early.

## Late-game screenshot review (from the smart bot's "intense" frames)
- **LOOPBACK** (ghost 64, ×8 brush): the closing box is a dense swarm of numbered ghosts. It's legible, but the late game becomes a tiny-box survival game. That is a different game from the open-arena opening.
- **SPELLSNAKE** (level 5, combo ×4.75): the board is cluttered with rocks, "THE! +270" lands, and the level banner reads well.
- **MAZEWRIGHT** (wave 18): a sprawling serpentine maze with ×9.5 path multipliers and +666 pops. This is the best-looking late game in the set, and the maze you built is legible as *yours*.
- **TILTWELL** (level 9): mostly stone. The colour/shape icons stay readable, and STONES "▲7 in 1" telegraphs well.
- **PIPWALK** (floor 19): "STRAIGHT ×7", a 12-face die, HP badges in the 400s–2200. Balatro-style number explosion achieved.
- **UPTEMPO** (193 BPM REDLINE, 996 perfects): the speedometer at redline with dense streams. It looks thrilling.
- **JUNK ORBIT** (level 7): a beautiful spirograph tangle of captured orbits, plus "BURNT OUT". Busy, but the colour coding holds.
- **MAGSUMO** (round 13): the ring has shrunk to roughly 1.5 puck diameters. The ceiling works, but at that size the round is a coin-flip, not a contest.
- **COMPOUND**: wealth shows as **"$18.9DDc"**, and these late-game suffixes (UDc, DDc) are unreadable to normal people. Use scientific-style notation past T (e.g. 1.9e40). The 5×5 grid of ×18/×24/×56 badges is very Balatro, but it is visual noise.

## KICKBACK, after the on-ramp rework (Phase 4)
- Round 2, run 1 (semi-blind burst/turn/cool loop): 150 pts, 16.5 s. Cause: "clipped by a rock shard" from my own kill, which was fair. In round 1 my runs lasted 4–9 s.
- The white drift arrow is the key fix: I can finally see where I'm going. The eased turn is snappy (180° in about 0.37 s), so I now *overshoot* aim slightly, which is a much better problem to have. The rim shield saved me twice. The solid nose with its yellow muzzle dot reads instantly.
- Gut score moves from 5.5 to 7.0. The core (shots are movement) was always good; it just needed an on-ramp.

## Phone layouts (390×844 contact sheet of all 10)
All ten switch to touch-specific hints and controls:
- KICKBACK: "HOLD a finger: aim + fire"
- LOOPBACK: "DRAG to move · TAP 2nd finger to dash"
- TILTWELL: a 5-button bar
- SPELLSNAKE: "TAP ANYWHERE TO CAST / SPIT"
- PIPWALK: swipe or tap beside the die
- MAZEWRIGHT: tap cells or the core
- UPTEMPO: TAP lane pads plus tap-sky to brake
- COMPOUND: tap a cell, then a card
- JUNK ORBIT: drag to aim, release to fire
- MAGSUMO: drag steer plus a big FLIP button and a 2P toggle

None of them scrolls horizontally. The smallest text is the KICKBACK and LOOPBACK hint lines, which are readable but small.
