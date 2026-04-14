import { CARDS } from '../data/cards';
import { CHARACTERS } from '../data/characters';
import type { CardDefinition, CardRank, DuelState, FighterState, PlayerId, RangeBand } from './types';

const MAX_FLOW = 3;
const MAX_BEATS = 3;

function makeRng(seed: number): () => number {
  let value = seed || 1;
  return () => {
    value = (value * 48271) % 0x7fffffff;
    return value / 0x7fffffff;
  };
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const rng = makeRng(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function shiftRange(range: RangeBand, move: number): RangeBand {
  const order: RangeBand[] = ['Near', 'Mid', 'Far'];
  const idx = order.indexOf(range);
  const next = Math.max(0, Math.min(2, idx + move));
  return order[next];
}

function canHit(card: CardDefinition, range: RangeBand): boolean {
  if (card.hit === 'Any') return true;
  if (card.hit === 'None') return false;
  if (card.hit === 'Near') return range === 'Near';
  return range === 'Mid' || range === 'Far';
}

function effectiveRank(rank: CardRank, previous?: number): number {
  if (rank === '*') return Math.min(3, Math.max(1, previous ?? 1));
  return rank;
}

function drawToFive(f: FighterState): void {
  while (f.draw.length < 5) {
    if (f.deck.length === 0) {
      f.deck = [...f.discarded];
      f.discarded = [];
    }
    const next = f.deck.shift();
    if (!next) break;
    f.draw.push(next);
  }
}

function clearBeatOnlyState(state: DuelState): void {
  state.fighters.player.chosenForExchange = state.fighters.player.chosenForExchange;
  state.fighters.ai.chosenForExchange = state.fighters.ai.chosenForExchange;
}

function applyDamage(state: DuelState, target: PlayerId, amount: number, log: string[]): number {
  const fighter = state.fighters[target];
  const stoneReduction = fighter.passive === 'stone' && state.beat === 1 ? 1 : 0;
  let final = Math.max(0, amount - stoneReduction);
  const guard = fighter.flow > 0 ? 0 : 0;
  final = Math.max(0, final - guard);
  fighter.hp -= final;
  if (final > 0) {
    log.push(`${target} takes ${final} damage`);
  }
  return final;
}

export function initDuel(seed = 7, playerChar: 'stone' | 'wind' = 'stone', aiChar: 'stone' | 'wind' = 'wind'): DuelState {
  const pDeck = shuffle([...CHARACTERS[playerChar].starterDeck], seed + 11);
  const aDeck = shuffle([...CHARACTERS[aiChar].starterDeck], seed + 19);
  const state: DuelState = {
    seed,
    range: 'Mid',
    beat: 1,
    exchange: 1,
    winner: null,
    fastResolve: false,
    logs: [],
    fighters: {
      player: {
        id: 'player', hp: 20, flow: 0, initiative: true, deck: pDeck, draw: [], hand: [], chosenForExchange: [], discarded: [], passive: playerChar
      },
      ai: {
        id: 'ai', hp: 20, flow: 0, initiative: false, deck: aDeck, draw: [], hand: [], chosenForExchange: [], discarded: [], passive: aiChar
      }
    }
  };
  startExchange(state);
  return state;
}

export function startExchange(state: DuelState): void {
  for (const id of ['player', 'ai'] as const) {
    const fighter = state.fighters[id];
    fighter.flow = Math.min(MAX_FLOW, fighter.flow);
    fighter.lastEffectiveRank = undefined;
    fighter.chosenForExchange = [];
    fighter.draw = [];
    fighter.hand = [];
    drawToFive(fighter);
  }
  state.beat = 1;
}

export function keepCards(state: DuelState, playerKeepIds: string[], aiKeepIds: string[]): void {
  const apply = (id: PlayerId, picks: string[]) => {
    const f = state.fighters[id];
    f.hand = [...picks];
    const set = new Set(picks);
    for (const cardId of f.draw) {
      if (!set.has(cardId)) f.discarded.push(cardId);
    }
    f.draw = [];
  };
  apply('player', playerKeepIds);
  apply('ai', aiKeepIds);
}

function resolveCardPlay(
  state: DuelState,
  actor: PlayerId,
  enemy: PlayerId,
  actorCard: CardDefinition,
  guardPool: Record<PlayerId, number>,
  events: string[]
): { damageDealt: number; rangeChanged: boolean } {
  const actorState = state.fighters[actor];
  const enemyState = state.fighters[enemy];
  let rangeChanged = false;
  if (actorCard.move !== 0) {
    const before = state.range;
    state.range = shiftRange(state.range, actorCard.move);
    rangeChanged = before !== state.range;
    events.push(`${actor} shifts range ${before} -> ${state.range}`);
  }
  const guardValue = actorCard.guard + (actorCard.id === 'guard_flow' && actorState.flow >= 2 ? 1 : 0);
  if (guardValue > 0) {
    events.push(`${actor} gains ${guardValue} guard this beat`);
  }

  let damage = 0;
  const bonus = actorCard.flowDamageBonus && actorState.flow > 0 ? 1 : 0;
  if (canHit(actorCard, state.range)) {
    damage = actorCard.damage + bonus;
    if (actorCard.cashOutFlow && actorState.flow > 0) {
      damage += 1;
      actorState.flow = 0;
      events.push(`${actor} cashes Flow for +1 damage`);
    }
    const block = Math.min(guardPool[enemy], damage);
    guardPool[enemy] -= block;
    let total = Math.max(0, damage - block);
    if (total > 0) {
      total = applyDamage(state, enemy, total, events);
      damage = total;
    } else {
      events.push(`${actor}'s strike is guarded`);
      damage = 0;
    }
  } else if (actorCard.damage > 0) {
    events.push(`${actor} whiffs at ${state.range}`);
  }

  if (actorCard.reduceEnemyFlow) {
    enemyState.flow = Math.max(0, enemyState.flow - actorCard.reduceEnemyFlow);
    events.push(`${actor} reduces enemy Flow by ${actorCard.reduceEnemyFlow}`);
  }
  if (actorCard.gainInitiativeOnReveal) {
    actorState.initiative = true;
    enemyState.initiative = false;
    events.push(`${actor} seizes initiative`);
  }

  if (actorCard.arm) {
    actorState.armed = {
      sourceCardId: actorCard.id,
      owner: actor,
      name: actorCard.arm.name,
      triggerBeat: state.beat + actorCard.arm.triggerBeatOffset,
      damage: actorCard.arm.damage,
      hit: actorCard.arm.hit,
      breakOnOwnerDamaged: actorCard.arm.breakOnOwnerDamaged ?? false,
      breakOnRangeChange: actorCard.arm.breakOnRangeChange ?? false,
      active: true
    };
    events.push(`${actor} arms ${actorCard.arm.name}`);
  }

  return { damageDealt: damage, rangeChanged };
}

function updateFlow(f: FighterState, card: CardDefinition): void {
  const eff = effectiveRank(card.rank, f.lastEffectiveRank);
  if (f.lastEffectiveRank !== undefined && eff > f.lastEffectiveRank) {
    f.flow = Math.min(MAX_FLOW, f.flow + 1);
  }
  f.lastEffectiveRank = eff;
}

function armedResolve(state: DuelState, owner: PlayerId, events: string[], ownerDamaged: boolean, rangeChanged: boolean): void {
  const armed = state.fighters[owner].armed;
  if (!armed || !armed.active) return;
  if (armed.triggerBeat !== state.beat) return;
  if (armed.breakOnOwnerDamaged && ownerDamaged) {
    events.push(`${owner}'s armed effect breaks on damage`);
    state.fighters[owner].armed = undefined;
    return;
  }
  if (armed.breakOnRangeChange && rangeChanged) {
    events.push(`${owner}'s armed effect breaks on range change`);
    state.fighters[owner].armed = undefined;
    return;
  }
  const target: PlayerId = owner === 'player' ? 'ai' : 'player';
  if (canHit({ id: '', name: '', tags: ['Attack'], rank: 1, speed: 0, damage: armed.damage, guard: 0, move: 0, hit: armed.hit }, state.range)) {
    applyDamage(state, target, armed.damage, events);
    events.push(`${owner}'s armed effect ${armed.name} triggers`);
  }
  state.fighters[owner].armed = undefined;
}

export function resolveBeat(state: DuelState, playerCardId: string, aiCardId: string): void {
  if (state.winner) return;
  const beatEvents: string[] = [];
  const cards = { player: CARDS[playerCardId], ai: CARDS[aiCardId] };
  state.fighters.player.hand = state.fighters.player.hand.filter((c) => c !== playerCardId);
  state.fighters.ai.hand = state.fighters.ai.hand.filter((c) => c !== aiCardId);
  state.fighters.player.chosenForExchange.push(playerCardId);
  state.fighters.ai.chosenForExchange.push(aiCardId);

  updateFlow(state.fighters.player, cards.player);
  updateFlow(state.fighters.ai, cards.ai);

  let ordering: PlayerId[] = ['player', 'ai'];
  if (cards.player.speed !== cards.ai.speed) {
    ordering = cards.player.speed < cards.ai.speed ? ['player', 'ai'] : ['ai', 'player'];
  } else {
    ordering = state.fighters.player.initiative ? ['player', 'ai'] : ['ai', 'player'];
  }

  const damageDealt: Record<PlayerId, number> = { player: 0, ai: 0 };
  const guardPool: Record<PlayerId, number> = {
    player: cards.player.guard + (cards.player.id === 'guard_flow' && state.fighters.player.flow >= 2 ? 1 : 0),
    ai: cards.ai.guard + (cards.ai.id === 'guard_flow' && state.fighters.ai.flow >= 2 ? 1 : 0)
  };
  let rangeChanged = false;
  for (const actor of ordering) {
    const enemy: PlayerId = actor === 'player' ? 'ai' : 'player';
    const result = resolveCardPlay(state, actor, enemy, cards[actor], guardPool, beatEvents);
    damageDealt[actor] += result.damageDealt;
    rangeChanged ||= result.rangeChanged;
  }

  armedResolve(state, 'player', beatEvents, damageDealt.ai > 0, rangeChanged);
  armedResolve(state, 'ai', beatEvents, damageDealt.player > 0, rangeChanged);

  if (damageDealt.player > 0 && damageDealt.ai === 0) {
    state.fighters.player.initiative = true;
    state.fighters.ai.initiative = false;
  } else if (damageDealt.ai > 0 && damageDealt.player === 0) {
    state.fighters.ai.initiative = true;
    state.fighters.player.initiative = false;
  } else if (damageDealt.ai === 0 && damageDealt.player === 0) {
    const pInit = state.fighters.player.initiative;
    state.fighters.player.initiative = !pInit;
    state.fighters.ai.initiative = pInit;
  }

  if (state.fighters.player.hp <= 0 && state.fighters.ai.hp <= 0) state.winner = 'draw';
  else if (state.fighters.player.hp <= 0) state.winner = 'ai';
  else if (state.fighters.ai.hp <= 0) state.winner = 'player';

  state.logs.unshift({ beat: state.beat, cards: { player: playerCardId, ai: aiCardId }, ordering, events: beatEvents });

  if (!state.winner) {
    state.beat += 1;
    if (state.beat > MAX_BEATS) {
      endExchange(state);
    }
  }
  clearBeatOnlyState(state);
}

function endExchange(state: DuelState): void {
  for (const id of ['player', 'ai'] as const) {
    const f = state.fighters[id];
    f.discarded.push(...f.hand, ...f.chosenForExchange);
    f.hand = [];
    f.chosenForExchange = [];
    f.lastEffectiveRank = undefined;
    f.flow = Math.min(MAX_FLOW, f.flow);
  }
  state.exchange += 1;
  startExchange(state);
}

export function getCard(id: string): CardDefinition {
  return CARDS[id];
}
