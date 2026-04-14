import { getCard } from '../engine/core';
import type { DuelState } from '../engine/types';

export function chooseAiKeep(state: DuelState): string[] {
  const draw = [...state.fighters.ai.draw];
  const score = (cardId: string): number => {
    const c = getCard(cardId);
    let s = 0;
    if (c.hit === 'Any') s += 4;
    if (c.hit === 'Near' && state.range === 'Near') s += 3;
    if (c.hit === 'MidOrFar' && (state.range === 'Mid' || state.range === 'Far')) s += 3;
    if (c.tags.includes('Defense') && state.fighters.ai.hp <= 10) s += 2;
    if (c.rank === '*') s += 1;
    return s + (Math.random() * 0.8);
  };
  return draw.sort((a, b) => score(b) - score(a)).slice(0, 3);
}

export function chooseAiBeatCard(state: DuelState): string {
  const hand = state.fighters.ai.hand;
  const self = state.fighters.ai;
  const enemy = state.fighters.player;
  let best = hand[0];
  let bestScore = -999;

  for (const id of hand) {
    const c = getCard(id);
    let score = 0;
    if (c.hit === 'Any') score += 4;
    if (c.hit === 'Near' && state.range === 'Near') score += 4;
    if (c.hit === 'MidOrFar' && (state.range === 'Mid' || state.range === 'Far')) score += 4;
    if (c.tags.includes('Defense') && self.hp < enemy.hp) score += 2;
    if (c.tags.includes('Trick')) score += 1.5;

    const lastRank = self.lastEffectiveRank ?? 0;
    if (c.rank === '*') score += 1.2;
    else if (c.rank > lastRank) score += 1.8;

    if (c.gainInitiativeOnReveal && !self.initiative) score += 2;
    if (enemy.hp <= 4 && c.damage > 0) score += 2;

    // dramatic read chance
    if (Math.random() < 0.15 && c.tags.includes('Attack')) score += 2.5;

    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}
