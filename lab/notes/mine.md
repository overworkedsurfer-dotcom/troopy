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
