# AGENTS.md

## Project overview
This repo contains a mobile-first browser prototype for a serious samurai-inspired simultaneous card dueler.

## Goals
- Ship a playable prototype quickly.
- Prioritize readable combat and clean architecture.
- Prefer a working game over over-polish.

## Tech expectations
- Reuse the existing stack if suitable.
- Otherwise use Vite + React + TypeScript.
- Keep game engine logic separate from UI.
- Favor pure TypeScript for combat logic.
- Add tests for core combat rules.

## Architecture rules
- Put combat logic under `src/game/engine`.
- Put card and character data under `src/game/data`.
- Put AI logic under `src/game/ai`.
- Put UI under `src/ui`.
- Put docs under `docs`.

## Gameplay rules
- 20 HP per player.
- Shared range: Near / Mid / Far.
- Start at Mid.
- Deck size: 10.
- Draw 5 each exchange, keep 3.
- Each exchange has 3 beats.
- Each beat, both players secretly choose 1 remaining card.
- Reveal simultaneously.
- Lower speed acts first.
- Ties go to initiative.
- First player to deal damage in a beat gains initiative.
- If no one deals damage in a beat, initiative swaps.
- Guard lasts for the current beat only.
- After beat 3, discard all used and unused cards from that exchange and redraw 5.
- Double KO is a draw.

## Flow rules
- Every card has Rank 1, 2, 3, or *.
- Rank * is a Bridge card and can count as any rank for Flow purposes.
- If a player reveals a higher effective rank than the last rank they played this exchange, increase Flow by 1.
- Max Flow is 3.
- Flow should be rewarding but not mandatory.
- Some cards should build Flow, some should cash it out, and some should disrupt enemy Flow.

## Armed effects
- Armed effects trigger at end of beat after both chosen cards resolve.
- Armed effects happen in addition to the chosen card on the trigger beat.
- Max 1 armed card per player.

## UI priorities
- Mobile-first.
- Always show HP, shared range, initiative, Flow, and armed indicators clearly.
- Keep the duel readable on a phone-sized screen.
- Add a Fast Resolve option for exchanges.

## AI priorities
- Prefer valid hits over obvious whiffs.
- Understand range, initiative, and Flow.
- Use Defense when pressured.
- Use Trick to reposition, disrupt, or set up.
- Sometimes make dramatic reads.

## Guardrails
- No online multiplayer.
- No backend.
- No heavy progression systems.
- No recursive infinite trigger chains.
- No unbounded extra actions.
- Add fail-safes so beats and exchanges always terminate cleanly.

## Testing
Add tests for:
- speed ordering
- initiative tiebreaks
- shared range updates
- hit checks after movement
- Guard lasting only one beat
- armed effects triggering at end of beat
- Flow increases and disruptions
- exchange cleanup
- KO and double KO handling

## Working style
- Audit the repo and reuse what is useful.
- Make grounded assumptions instead of blocking.
- Keep changes incremental.
- Preserve working behavior as you go.
- Favor shipping a playable prototype over polishing forever.
