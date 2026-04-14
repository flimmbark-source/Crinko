export type PlayerId = 'player' | 'ai';
export type RangeBand = 'Near' | 'Mid' | 'Far';
export type Tag = 'Attack' | 'Defense' | 'Trick';
export type CardRank = 1 | 2 | 3 | '*';

export type HitProfile = 'Near' | 'MidOrFar' | 'Any' | 'None';

export interface CardDefinition {
  id: string;
  name: string;
  tags: Tag[];
  rank: CardRank;
  speed: number;
  damage: number;
  guard: number;
  move: number; // positive opens, negative closes
  hit: HitProfile;
  flowDamageBonus?: boolean;
  cashOutFlow?: boolean;
  reduceEnemyFlow?: number;
  gainInitiativeOnReveal?: boolean;
  arm?: ArmedTemplate;
}

export interface ArmedTemplate {
  name: string;
  triggerBeatOffset: number;
  damage: number;
  hit: HitProfile;
  breakOnOwnerDamaged?: boolean;
  breakOnRangeChange?: boolean;
}

export interface ArmedState {
  sourceCardId: string;
  owner: PlayerId;
  name: string;
  triggerBeat: number;
  damage: number;
  hit: HitProfile;
  breakOnOwnerDamaged: boolean;
  breakOnRangeChange: boolean;
  active: boolean;
}

export interface FighterState {
  id: PlayerId;
  hp: number;
  flow: number;
  initiative: boolean;
  deck: string[];
  draw: string[];
  hand: string[];
  chosenForExchange: string[];
  discarded: string[];
  lastEffectiveRank?: number;
  armed?: ArmedState;
  passive: 'stone' | 'wind';
}

export interface BeatLog {
  beat: number;
  cards: Record<PlayerId, string>;
  ordering: PlayerId[];
  events: string[];
}

export interface DuelState {
  seed: number;
  range: RangeBand;
  beat: number;
  exchange: number;
  winner: PlayerId | 'draw' | null;
  fighters: Record<PlayerId, FighterState>;
  logs: BeatLog[];
  fastResolve: boolean;
}
