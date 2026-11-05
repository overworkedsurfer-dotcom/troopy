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
