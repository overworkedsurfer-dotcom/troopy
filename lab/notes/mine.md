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
