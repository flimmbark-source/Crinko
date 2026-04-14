import { SHARED_POOL_IDS } from './cards';

export interface CharacterDefinition {
  id: 'stone' | 'wind';
  name: string;
  passiveName: string;
  passiveText: string;
  signatureCardIds: string[];
  starterDeck: string[];
}

const shared = SHARED_POOL_IDS;

export const CHARACTERS: Record<'stone' | 'wind', CharacterDefinition> = {
  stone: {
    id: 'stone',
    name: 'Stone School',
    passiveName: 'Rooted Resolve',
    passiveText: 'First time each exchange you take damage, reduce it by 1.',
    signatureCardIds: ['stone_guard', 'stone_counter', 'stone_anchor', 'stone_crush'],
    starterDeck: ['stone_guard', 'stone_counter', 'stone_anchor', 'stone_crush', shared[0], shared[2], shared[4], shared[6], shared[8], shared[10]]
  },
  wind: {
    id: 'wind',
    name: 'Wind School',
    passiveName: 'Dancing Edge',
    passiveText: 'If you changed range this beat, gain +1 speed on your next beat in this exchange.',
    signatureCardIds: ['wind_step', 'wind_gale', 'wind_feint', 'wind_storm'],
    starterDeck: ['wind_step', 'wind_gale', 'wind_feint', 'wind_storm', shared[1], shared[3], shared[5], shared[7], shared[9], shared[11]]
  }
};
