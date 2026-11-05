# What Makes a Game Fun: The Fun Lab Rubric

This file is the scoring rubric for every game in the lab. Each principle comes
from published design writing or research. Each one has a **test** that can be
checked by a bot run (**B**), by a person or critic playing (**P**), or by
reading the code (**C**).

## The short version of the research

- **MDA (Hunicke, LeBlanc, Zubek, 2004).** Designers build *mechanics*, which
  produce run-time *dynamics*, which players feel as *aesthetics*. The paper
  replaces the vague word "fun" with eight aesthetics: Sensation, Fantasy,
  Narrative, Challenge, Fellowship, Discovery, Expression, Submission. The
  designer works from mechanics outward; the player meets the aesthetics first.
- **Koster, *A Theory of Fun* (2005).** Fun is the feeling of learning: the
  brain enjoys finding and absorbing a pattern ("grokking"). Boredom arrives
  when the pattern runs out, either because it is mastered or because it is
  unreadable. Games with more interacting variables keep producing new
  patterns for longer.
- **Flow (Csikszentmihalyi; Jenova Chen's *flOw*).** Absorption needs clear
  goals, immediate feedback, and challenge that keeps pace with skill. Chen
  built dynamic difficulty into *flOw* by letting the player's own choices set
  the difficulty. Critics point out that games with no difficulty at all (slot
  machines, *The Sims*) can also absorb people, so challenge is one route to
  flow, not the only one.
- **Self-determination theory and PENS (Ryan, Rigby, Przybylski, 2006).**
  Perceived *competence*, *autonomy* and *relatedness* each independently
  predict enjoyment and the wish to play again. Later validation found
  competence and intuitive controls behave as a single factor. In practice,
  feeling capable and feeling that the controls are easy are the same thing.
- **Game feel and juice (Swink, *Game Feel*; Jonasson & Purho, "Juice it or
  lose it", 2012; Nijman, "The Art of Screenshake").** The same Breakout game
  becomes far more enjoyable once you add tweening, screenshake, particles,
  flashes, sound and floating text. Hitstop (freezing a few frames on impact)
  gives a hit weight: roughly 2–4 frames for a light hit and 8–15 for a heavy
  one. Past about 20 frames it starts to look like a bug.
- **Forgiveness (Maddy Thorson on *Celeste*).** Coyote time, jump buffering
  and corner correction are hidden kindness: "it wants you to succeed". A
  very hard game can still feel fair when the inputs read what you meant.
- **Fair failure (Juul, *The Art of Failure*, 2013).** Failing in a game means
  *you* fell short, and that is what makes you try again. This only works when
  the failure is fair. A game that hides its rules or puts up an obstacle you
  cannot get past feels broken. Players prefer games where failure is their own
  responsibility.
- **Interesting decisions (Sid Meier).** A game is a series of interesting
  decisions. A decision is interesting when it has a real trade-off, the
  player has enough information to reason about it, and no option is always
  correct.
- **Easy to learn, hard to master (Bushnell's Law).** Tetris has one rule and
  three verbs, yet supports decades of mastery, including techniques such as
  T-spins that came out of the rules rather than being designed in. Bogost
  argues the "easy" part depends more on familiarity than on raw simplicity.
- **Dual-purpose verbs (*Downwell*).** The gunboots are a weapon, a brake and
  a steering tool. Stomping an enemy kills it, reloads the boots and bounces
  you. Depth comes from layering uses onto a few verbs, not from adding verbs.
- **The 30-second loop (Jaime Griesemer, *Halo*).** If you can make 30 seconds
  of fun, you can repeat it in new contexts to fill a whole game. A small
  change in tuning, such as the sniper reload going from 0.5 to 0.7 seconds,
  can reshape the whole thing.
- **Reward cadence and power fantasy (*Vampire Survivors*).** Something good
  happens roughly every 20–30 seconds. Early success needs no skill. Watching
  a build grow absurdly strong while you only just survive is the core feeling.
- **Multiplicative synergy (*Balatro*).** "+mult" combined with "×mult" makes
  players excited about combinations. Additive bonuses are forgettable;
  multiplicative ones stick. Builds that can break the game are allowed, but
  the target keeps climbing steeply, so you feel clever and the challenge
  survives.
- **Instant retry (*Flappy Bird*, *Super Meat Boy*).** Losing costs almost
  nothing, the controls take seconds to learn, and the margin for error is
  slim. Critics single out Flappy Bird's roughly one-second delay before the
  restart button as a needless irritant.
- **Near-miss and grazing (bullet-hell scoring).** Rewarding a close call
  (grazing a bullet, scraping a wall) turns danger into something you choose to
  approach. In a skill game a near miss is useful feedback. In a game of pure
  chance it is a manipulation, so these games use it only where skill decides
  the outcome.
- **The unfinished task (Tetris, the Zeigarnik effect).** Every cleared line
  opens a new problem, and unfinished problems stay on your mind. The evidence
  for the Zeigarnik effect is mixed, so treat it as a useful idea, not settled
  science.

## The 15 principles and their tests

Each principle scores **0** (fails the test), **1** (partly passes) or **2**
(passes). The total is out of 30. **Fun score (1–10) = round(total / 3)**, with
a minimum of 1.

| # | Principle | Source | Test | How checked |
|---|-----------|--------|------|-------------|
| 1 | **Readable in 5 seconds.** You know what to do without a tutorial. | Bushnell; Flappy Bird | A first-time player makes a meaningful input within 5 s of the page loading. There is no menu or modal before play. The controls hint is on the first screen. | P, C |
| 2 | **Clear goal, always-visible score.** | Csikszentmihalyi (clear goals) | The score is on screen in every frame of play. The goal can be stated in one sentence after one run. | P, C |
| 3 | **Immediate, juicy feedback.** Every input is answered and every big event lands hard. | Swink; Jonasson & Purho; Nijman | Every input produces a visible change within one frame. Each major event (hit, clear, death, level-up) uses at least 3 of these channels: particles, screenshake, hitstop, easing/tween, flash, sound, floating text. | P, C |
| 4 | **Forgiving input.** The game reads intent, not exact pixels. | Thorson (*Celeste*) | At least one forgiveness mechanic: input buffering, coyote time, a hitbox smaller than the sprite, or snap/assist. The critic counts no deaths as "that wasn't my fault". | P, C |
| 5 | **Fair, legible failure.** You can see why you lost. | Juul | The game-over screen names the cause. In a bot run, at least 90% of game-overs report a `cause` string. A blind player can explain their own death. | B, P |
| 6 | **Instant retry.** Losing costs almost nothing. | Flappy Bird; Super Meat Boy | One input restarts play, and play resumes under 1 s after game-over (excluding a 300–500 ms anti-mis-tap lockout). | P, C |
| 7 | **Interesting decisions.** Choices matter. | Sid Meier | **Skill gap:** smart-bot median score ≥ 3× random-bot median, *or* the two distributions separate by more than 2 pooled standard deviations. | B |
| 8 | **A pattern to learn.** Mastery is a smooth slope, not a cliff. | Koster | The heuristic bot's median falls strictly between random and smart. A human's best score improves across the first 3–5 runs. | B, P |
| 9 | **Escalation, so you stay in the flow channel.** | Csikszentmihalyi; Chen | A difficulty variable rises during a run. Smart-bot median session length is 60–300 s of game time. | B |
| 10 | **Not solved.** No strategy survives forever. | Koster (boredom = mastered pattern) | 0% of sessions, for any bot, hit the 15-minute game-time cap. | B |
| 11 | **Risk and reward.** Greed pays, and greed kills. | Bullet-hell grazing; *Downwell* combos; Balatro | At least one optional, riskier action gives more score (graze, combo, cash-in, push-your-luck). The critic can name the tension. | P, C |
| 12 | **Few verbs, deep use.** At most ~5 inputs, at least one serving two purposes. | *Downwell*; Tetris; Bushnell | `getActions()` returns at most 6 actions, including `none`. At least one verb serves two or more purposes (for example, shooting also moves you). | C |
| 13 | **Variety from seeds and systems.** No two runs are the same. | Koster (more variables); emergent systems | Smart-bot scores across 50 seeds have a coefficient of variation ≥ 0.15. Different seeds produce visibly different situations in screenshots. | B, P |
| 14 | **Reward cadence and number-go-up.** Something good happens often and compounds. | *Vampire Survivors*; Balatro | In a smart-bot run a scoring or reward event happens at least every 30 s. A multiplier or combo exists that compounds, not just adds. | B, C |
| 15 | **"One more go".** The run ends while you still want more. | Zeigarnik; Flappy Bird; PENS (intention to replay) | The best score is shown at game-over. The critic says they would play again after the 3rd run. Smart-bot median session is under 5 min. | P, B |

### Hard gate: robustness

A game with **any console error** or **a determinism failure** (the same seed
and inputs giving a different result) is **disqualified** until fixed. It
cannot win, however fun it is. This is not one of the 15 because it is not a
property of fun. Broken games simply cannot be measured.

### How the lab turns the rubric into a ranking

- The **bot score** (out of 10) comes from principles 5, 7, 8, 9, 10, 13 and 14,
  measured automatically and rescaled.
- The **critic score** (1–10) comes from a blind critic subagent. It plays each
  game without seeing the code and scores all 15 principles.
- **My score** (1–10) comes from my own Playwright play sessions and notes.
- **Final rank** = 0.3 × bot + 0.35 × critic + 0.35 × mine. Ties are broken by
  skill gap.

### MDA aesthetic targets

Each game declares one primary MDA aesthetic in its DECISIONS.md entry. The
critic is asked which aesthetic they felt. If the two match, that is evidence
the mechanics deliver the intended feeling.

## Sources

- Hunicke, LeBlanc, Zubek, "MDA: A Formal Approach to Game Design and Game Research" — https://users.cs.northwestern.edu/~hunicke/MDA.pdf · https://en.wikipedia.org/wiki/MDA_framework
- Koster, *A Theory of Fun for Game Design* — summaries: https://game-studies.fandom.com/wiki/A_Theory_of_Fun_for_Game_Design?oldid=4071 · https://books.wtanaka.com/posts/a-theory-of-fun-for-game-design
- Flow and Jenova Chen's DDA — https://en.wikipedia.org/wiki/Flow_(video_game) · https://www.gamedeveloper.com/design/gamification-dynamics-flow-and-art
- Ryan, Rigby, Przybylski, SDT and games; PENS — https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/ · https://game-evaluation.github.io/questionnaires/repository/pens.html
- Juice it or lose it / game feel — https://gamejuice.pages.dev/articles/juice-it-or-lose-it-lessons · https://core.ac.uk/download/362610511.pdf
- Hitstop — https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/ · https://tvtropes.org/pmwiki/pmwiki.php/Main/HitStop
- Thorson, "Celeste & Forgiveness" — https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html
- Juul, *The Art of Failure* — https://lizengland.com/blog/review-the-art-of-failure-by-jesper-juul/
- Sid Meier's interesting decisions — https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions · https://jesperjuul.net/text/justwhatisit.html
- Bushnell's Law — https://en.wikipedia.org/wiki/Bushnell%27s_Law
- Downwell's dual-purpose design — https://medium.com/@scott.numamoto/downwell-minimalism-in-game-design-573a3d553db2
- "30 seconds of fun" — https://www.engadget.com/2011-07-14-half-minute-halo-an-interview-with-jaime-griesemer.html
- Vampire Survivors reward cadence — https://jboger.substack.com/p/the-secret-sauce-of-vampire-survivors · https://birdor-blog.pages.dev/vampire-survivors-low-friction-success-case-study/
- Balatro scaling and synergy — https://devindiegame.pages.dev/articles/why-balatro-succeeded.html · https://www.gamesradar.com/exploring-balatros-hype-its-ingenious-twists-on-poker-and-its-mysterious-creator
- Flappy Bird restart friction — https://www.gamedeveloper.com/business/a-flappy-case-of-a-flappy-bird · https://blogs.tuni.fi/playlab/game-research-highlights/the-enchantment-of-frustrating-casual-games/
- Tetris and the Zeigarnik effect — https://mindhacks.com/2012/10/29/bbc-future-column-the-psychology-of-tetris/ · https://tetris.com/article/44/what-makes-tetris-so-incredibly-addictive
- Grazing and near-miss — https://shmups.wiki/library/Category:Grazing_mechanic · https://www.psychologyofgames.com/2016/09/the-near-miss-effect-and-game-rewards/
