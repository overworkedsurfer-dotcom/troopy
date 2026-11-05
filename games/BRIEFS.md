# Design briefs: the 10 builds

These briefs are the starting design. Builders may change details to make a game
more fun, as long as they keep the **twist**, the contract (`CONTRACT.md`) and
the rubric (`../research/FUN.md`), and log the reason in their report. Each
brief names the primary MDA aesthetic.

---

## 1. KICKBACK (`kickback`): arcade action · aesthetic: **Challenge**
**Twist:** your gun is your only engine.
- You fly a ship in a circular zero-g arena whose **rim is electrified**: touching it kills you. There is no thrust at all. Every shot kicks you backward (recoil impulse), and drag is light.
- Holding fire auto-fires at a fixed rate. A **heat** meter overheats if you fire too long, locking your gun for about 1 s, and therefore locking your *movement* too. This is the tension.
- Enemies drift in from the rim: rocks that split, then seekers, then shooters. The waves escalate. The hard ceiling: spawn pressure rises without limit, and the arena slowly shrinks after wave N.
- **Risk/reward:** a *rim skim* (passing close to the rim) builds the multiplier. Point-blank kills give ×2. Fast consecutive kills build a combo.
- **Forgiveness:** the ship's hitbox is smaller than its sprite, and the rim kills only after about 3 frames of contact (a "coyote" grace with a red flash warning).
- **Controls:** ←/→ (A/D) rotate, Space/↑ (W) fire. **Touch:** hold a finger and the ship aims toward it and fires. Bot actions: `none, left, right, fire, leftfire, rightfire` (held).
- **Juice:** recoil shake, muzzle flash, hitstop on kills, debris, heat-glow on the ship, rim crackle.

## 2. LOOPBACK (`loopback`): weird · aesthetic: **Discovery / Challenge**
**Twist:** your past self is the bullet hell.
- A top-down arena. You move a glowing dot and collect orbs, which appear one or two at a time.
- Every **8 s** a new **ghost** appears. Ghost *k* replays *your own movement* exactly, delayed by 8·*k* seconds. In other words, the places you were 8, 16, 24… seconds ago are lethal right now. Show a countdown ring for the next ghost, and show where it will appear about 1.5 s early. Ghosts are harmless while fading in.
- **Escalation:** ghosts accumulate. The ghost interval shrinks over time (for example 8 s → 5 s), which is the ceiling.
- **Risk/reward:** *brushing* past a ghost (a near-miss) builds a multiplier. Fast orb pickups build a combo. A **dash** (cooldown, brief invulnerability) is dual-purpose: escape, or *phase* through a ghost for a big bonus.
- **Forgiveness:** small hitboxes, a spawn warning, input buffering on dash.
- **Controls:** arrows/WASD move (diagonals OK for humans), Space/Shift dash. **Touch:** drag to steer, tap with a second finger (or double-tap) to dash. Bot actions: `none, up, down, left, right, dash`.
- **Juice:** neon trails, ghost numbers, a chromatic flash when a ghost spawns, slow-mo plus a shatter on death that shows *which* ghost (time-stamp) killed you.

## 3. TILTWELL (`tiltwell`): puzzle · aesthetic: **Challenge / Discovery**
**Twist:** you rotate the world, never the piece.
- A square well, roughly 8×8. Coloured domino pieces (2 cells, 4 colours at first) fall from the "top". You can move them left and right and hard-drop them.
- **Tilt:** rotate the whole well 90° left or right. Gravity re-settles **every loose cell** individually (sand-like) toward the new floor. On screen the board animates rotating so that gravity always points down.
- 4 or more orthogonally connected cells of the same colour pop. Falling cells can then chain: a **chain multiplier** (×2, ×3…) applies, and tilts can set up huge cascades.
- **Tilt charges:** you hold 3 and recharge them by popping. A free tilt would be too strong.
- **Escalation:** fall speed rises, a 5th colour arrives, and *stone* garbage cells (cleared only by adjacent pops) rise in every N pieces. The ceiling is reached when the well overflows (a piece can't spawn).
- **Risk/reward:** hold off popping to build a bigger cascade while garbage looms.
- **Forgiveness:** a ghost preview of where the piece lands, a lock delay, and a preview of the next piece.
- **Controls:** ←/→ move, ↓/Space drop, Q/E (or Z/X) tilt. **Touch:** an on-screen button bar (⟲ ← ↓ → ⟳) plus swipes. Bot actions: `none, left, right, drop, tiltL, tiltR`.
- **Juice:** an eased board rotation (about 200 ms), cells raining down, pop bursts, "CHAIN ×3!" pops, hitstop and shake scaled by chain.

## 4. SPELLSNAKE (`spellsnake`): word · aesthetic: **Challenge / Expression**
**Twist:** your body is the word.
- Grid snake. Letter tiles spawn on the board, weighted by English frequency, with vowels kept available. Eating a letter adds it at the head, so your body reads tail→head as a string.
- When the letters at the **head end** form a valid word (3+ letters), it glows. **CAST** cashes it: those letters leave your body (you shrink) and score Scrabble-ish letter values × a length multiplier (for example length²) × a streak combo.
- **CAST is dual-purpose:** with no valid word, it *spits* the last letter instead (a small penalty), so you can never be stuck with junk.
- **Risk/reward:** greedier, longer words score a lot more but make you longer, and the board is more dangerous.
- **Escalation:** speed rises, and rocks or walls appear on the board after each cast. The ceiling is reached when speed and clutter overwhelm you.
- **Forgiveness:** a buffered turn queue (2 turns) and no instant 180° reversal.
- **Dictionary:** embedded in the HTML. Build a common-word list (3–8 letters, about 8–20k words) from an MIT/permissively licensed npm package (for example `wordlist-english` SCOWL sizes 10–35, or `an-array-of-english-words` filtered), generated by a script you keep at `lab/tools/build-wordlist-spellsnake.js`.
- **Controls:** arrows/WASD turn, Space/Enter cast. **Touch:** swipe to turn, tap to cast. Bot actions: `none, up, down, left, right, cast`.
- **Juice:** letters pop off the body one by one when cast (staggered), word flies to the score, typewriter clicks, shake on big words.

## 5. PIPWALK (`pipwalk`): roguelite · aesthetic: **Challenge / Discovery**
**Twist:** you *are* a die; rolling is moving, and the face on top is your weapon.
- A grid room (for example 7×7). Each move **tips** the die one cell, rotating its faces like a real cube. **Bumping** an adjacent enemy deals damage equal to your **top face**, and you stay in place. It is turn-based: each of your moves is one turn, and enemies (with visible HP and intents) then act.
- Show the **preview** of which face would come up for each direction. This makes the decisions legible.
- Clear the room to get a pick of **1 of 3 upgrades**: rewrite a face (for example a 6 becomes "🔥8 splash", a 1 becomes "shield"), +1 to odd faces, heal, and so on. You build your die.
- **Combo:** consecutive hits with ascending faces, or matching faces, multiply damage and score (multiplicative, Balatro-style).
- **Escalation:** each floor adds more and stronger enemies, with exponential HP and damage scaling as the ceiling. A *dread* counter spawns extra enemies if you dawdle.
- **Risk/reward:** go for the combo line or play safe. There are optional elite enemies for bonus picks.
- **Controls:** arrows/WASD roll. In upgrade selection, 1/2/3 (or ←/→ + Space). **Touch:** swipe, or tap an adjacent tile, and tap the cards. Bot actions in a room: `none, up, down, left, right`. In picks: `none, pick1, pick2, pick3`.
- **Juice:** squash-and-stretch roll tweens, damage numbers, hitstop on big hits, dice clatter sounds, and a face-reveal flash.

## 6. MAZEWRIGHT (`mazewright`): tiny strategy · aesthetic: **Challenge / Expression**
**Twist:** you never build towers; the path you force is your only weapon.
- A roughly 9×9 grid with one **auto-turret core** in the middle (range of about 3.5 cells). Enemies enter from edge gates and walk (BFS shortest path) to the core.
- Each wave you get a few **single wall blocks** to place. You can't fully block the path; invalid cells are shown. The **live path preview** redraws as you place.
- **Greed:** start the wave early by selecting the core. Each unplaced wall becomes a +1 **score multiplier** for that wave. Points per kill = base × path-length factor × (1 + banked walls) × combo.
- Between waves, pick 1 of 3 turret upgrades (damage, range, rate, pierce…).
- **Escalation:** exponential enemy HP, speed and count. From wave ~8, *flyers* ignore walls. Bosses arrive every 5 waves. The ceiling: HP outpaces upgrades.
- **Forgiveness:** placement highlights validity, there is an undo of the last wall before the wave starts, and the path preview.
- **Controls:** arrows move the cursor, Space places (on the core it starts the wave). **Mouse/touch:** tap a cell to place, tap the core to start. Bot actions: `none, up, down, left, right, place`. In upgrades, ←/→ moves the selection and `place` confirms.
- **Juice:** turret recoil and laser, enemy pop particles, a red flash plus shake on core damage, squash on wall placement, a counting tally at the end of each wave.

## 7. UPTEMPO (`uptempo`): rhythm · aesthetic: **Sensation / Challenge**
**Twist:** your accuracy drives the BPM. This is dynamic difficulty adjustment as the core mechanic.
- 4 lanes and a hit line. The music is a procedural synth loop (kick, snare, hats, bass), and each hit note plays a melody tone.
- A **PERFECT** raises BPM (+0.5 or so), a **GOOD** holds it, and a **MISS** drops it (−3) and costs HP. Score per hit = base × BPM/100 × combo.
- **Brake:** voluntarily drop 10 BPM at the cost of your combo. This is the self-chosen difficulty valve and the risk/reward choice.
- **Escalation and ceiling:** a BPM *floor* rises over time. At high BPM, patterns add jacks and streams, and each lane has a re-trigger lockout of about 90 ms, so beyond some BPM even perfect timing fails. HP drains, and perfects heal slightly.
- **Forgiveness:** generous GOOD windows early, and an early-hit grace.
- **Controls:** D F J K (or ←↓↑→), Space brakes. **Touch:** 4 lane zones plus a brake button. Bot actions: `none, l0, l1, l2, l3, brake` (one-shot; a smart bot can roll chords on consecutive frames).
- **Juice:** lane flashes, hit sparks, PERFECT/GOOD pops, the background pulsing on the beat, zoom pulses at combo milestones, a BPM speedometer needle, shake on misses.
- **Audio sync:** schedule sounds from the sim (beats crossing in `step()`) so audio and visuals agree.

## 8. COMPOUND (`compound`): idle/incremental · aesthetic: **Submission → Challenge**
**Twist:** a whole incremental game in about 3 minutes, racing an exponentially rising tide.
- Your **wealth** grows from generators on a tiny grid (for example 4×4 or 5×5). A **tide** line rises exponentially, and its exponent itself slowly accelerates (the hard ceiling). If wealth falls below the tide, the tide catches you and the game is over.
- **Buying costs wealth now.** Each purchase pulls your line toward the tide. This investment risk/reward is the core tension.
- A shop of **3 random cards** (it refreshes after a buy, and a reroll costs something). The types should synergise **multiplicatively by adjacency**: for example a Seed (+$/s), a Mill (×1.5 to neighbours), a Bank (+% of wealth/s, i.e. compounding), a Lens (doubles a row or column), and a Furnace (big output, but drains neighbours). The cards land on a cursor cell.
- Score = `floor(100 × log10(peak wealth + 1))`, shown as an integer, with wealth itself shown with K/M/B/T suffixes.
- **Controls:** 1/2/3 buy the card onto the cursor cell, arrows move the cursor, R rerolls. **Mouse/touch:** tap a card and then a cell (or drag). Bot actions: `none, buy1, buy2, buy3, next` (cursor to the next empty cell) and `reroll`.
- **Juice:** odometer number roll-ups, coin particles flying to the counter, synergy lines lighting between tiles, a tide wave animation with a heartbeat sound and red pulse when it gets close, purchase squash-and-stretch.

## 9. JUNK ORBIT (`junkorbit`): physics · aesthetic: **Discovery / Expression**
**Twist:** every comet you fire stays in orbit forever; your own history becomes the level.
- A space field with 1–3 planets (gravity wells). A launcher sits at the bottom, aims ←/→, and fires a comet (fixed power; or hold to charge, the builder decides).
- Comets fly under gravity. Comets in **bound orbits stay forever as junk**. Junk can **hit targets for you** (passive points) but also **collides with new comets**, and if junk sweeps through your launcher you lose a heart (3 hearts, with brief i-frames).
- Targets (stars) appear. Hitting several with one comet multiplies. A gravity-assist (slingshot around a planet before the hit) gives ×2.
- **Escalation:** targets move, planets shift between levels, and the aim-assist trajectory preview shortens. Junk accumulates, which is self-made escalation and the hard ceiling.
- **Forgiveness:** a dotted preview of the first part of the trajectory, generous target hitboxes, and i-frames.
- **Controls:** ←/→ aim, Space fire. **Touch:** drag to aim, release to fire. Bot actions: `none, left, right, fire` (left/right held).
- **Juice:** comet trails, impact flashes, hitstop on multi-hits, orbit trails fading, junk glowing brighter as it gets more dangerous.

## 10. MAGSUMO (`magsumo`): 2-player local · aesthetic: **Fellowship / Challenge**
**Twist:** you can't push; you can only steer and flip your magnet's polarity.
- A circular ice arena that shrinks during each round. Two pucks with low traction. The same polarity repels and opposite polarities attract (force ~1/r², clamped). Flipping polarity at point-blank range produces a huge launch, the **magnet slam** (risk/reward timing), and flipping has a short cooldown.
- **Solo:** a **CPU gauntlet**. Opponents get stronger (reaction, aggression, mass). You have 3 hearts, and losing a round costs one. Score = rounds won × 100 + style (slam ring-outs ×2, speed bonus). The ceiling: the CPU keeps improving and the ring gets smaller.
- **2-player:** pressing the P2 keys (arrows + Enter) switches to versus mode (P1 = WASD + Space, first to 5). On touch, the screen splits into halves, each with a drag-steer plus a flip button. The bot API drives P1 in the solo gauntlet.
- **Forgiveness:** the ring edge glows before you fall, there is a short "teeter" grace at the edge, and a polarity indicator is always visible.
- **Controls:** solo uses WASD or arrows to steer and Space/Shift to flip. Bot actions: `none, up, down, left, right, flip`.
- **Juice:** magnetic field lines (blue attract, red repel), sparks on collisions, slow-mo plus hitstop on ring-out, crowd "ooh" synth, ring-edge glow.
