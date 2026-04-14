# Game Rules

## Core duel structure
- Each fighter starts at 20 HP.
- Shared range has three bands: Near / Mid / Far.
- Duel starts at Mid.
- Deck size is 10 cards.
- At each exchange start, both fighters draw 5 and keep 3.
- Each exchange has 3 beats.
- On each beat, both select one remaining card and reveal simultaneously.

## Resolution
- Lower speed acts first.
- Speed ties are broken by initiative.
- Movement updates the one shared range state.
- Cards hit by hit profile (Near, Mid/Far, Any, or None).
- Guard applies only during the current beat.
- First side to deal damage gains initiative.
- If neither deals damage, initiative swaps.

## Flow
- Cards have rank 1, 2, 3, or *.
- Rank * acts as Bridge rank for sequencing.
- If your revealed card has higher effective rank than your previous this exchange, gain +1 Flow.
- Max Flow is 3.
- Flow is used by select cards for modest bonuses (+1 damage/guard, initiative pressure, disruption).

## Armed effects
- Some cards arm delayed effects.
- Armed effects resolve at end of beat after both cards finish.
- Armed effects are hidden in detail but visible via UI indicator.
- Break conditions may cancel armed effects (owner damaged/range changed).
- Max 1 armed effect per fighter.

## End conditions
- KO ends the duel.
- Double KO is a draw.
- After beat 3, all used and unused exchange cards are discarded, then both draw 5 for next exchange.
