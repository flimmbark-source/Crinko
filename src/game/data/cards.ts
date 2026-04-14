import type { CardDefinition } from '../engine/types';

export const CARDS: Record<string, CardDefinition> = {
  stone_guard: { id: 'stone_guard', name: 'Granite Guard', tags: ['Defense'], rank: 1, speed: 3, damage: 0, guard: 3, move: 0, hit: 'None' },
  stone_counter: { id: 'stone_counter', name: 'Counter Cut', tags: ['Attack'], rank: 2, speed: 4, damage: 2, guard: 1, move: 0, hit: 'Near', flowDamageBonus: true },
  stone_anchor: { id: 'stone_anchor', name: 'Anchor Stance', tags: ['Trick', 'Defense'], rank: '*', speed: 2, damage: 0, guard: 2, move: -1, hit: 'None' },
  stone_crush: { id: 'stone_crush', name: 'Boulder Drop', tags: ['Attack'], rank: 3, speed: 5, damage: 3, guard: 0, move: -1, hit: 'Near', cashOutFlow: true },

  wind_step: { id: 'wind_step', name: 'Swift Step', tags: ['Trick'], rank: 1, speed: 1, damage: 0, guard: 0, move: 1, hit: 'None', gainInitiativeOnReveal: true },
  wind_gale: { id: 'wind_gale', name: 'Gale Pierce', tags: ['Attack'], rank: 2, speed: 2, damage: 2, guard: 0, move: 1, hit: 'MidOrFar', flowDamageBonus: true },
  wind_feint: { id: 'wind_feint', name: 'Feint Drift', tags: ['Trick'], rank: '*', speed: 1, damage: 0, guard: 1, move: -1, hit: 'None', reduceEnemyFlow: 1 },
  wind_storm: { id: 'wind_storm', name: 'Storm Draw', tags: ['Attack'], rank: 3, speed: 2, damage: 2, guard: 0, move: 0, hit: 'Any', arm: { name: 'Lingering Slice', triggerBeatOffset: 1, damage: 1, hit: 'Any', breakOnOwnerDamaged: true, breakOnRangeChange: false } },

  strike_near_1: { id: 'strike_near_1', name: 'Short Edge', tags: ['Attack'], rank: 1, speed: 3, damage: 2, guard: 0, move: 0, hit: 'Near' },
  strike_midfar_1: { id: 'strike_midfar_1', name: 'Long Line', tags: ['Attack'], rank: 1, speed: 3, damage: 2, guard: 0, move: 0, hit: 'MidOrFar' },
  guard_basic_1: { id: 'guard_basic_1', name: 'Measured Guard', tags: ['Defense'], rank: 1, speed: 2, damage: 0, guard: 2, move: 0, hit: 'None' },
  open_step_1: { id: 'open_step_1', name: 'Retreat Step', tags: ['Trick'], rank: 1, speed: 1, damage: 0, guard: 0, move: 1, hit: 'None' },
  close_step_2: { id: 'close_step_2', name: 'Pressure Step', tags: ['Trick'], rank: 2, speed: 1, damage: 0, guard: 0, move: -1, hit: 'None' },
  any_cut_2: { id: 'any_cut_2', name: 'Center Cut', tags: ['Attack'], rank: 2, speed: 3, damage: 1, guard: 0, move: 0, hit: 'Any' },
  bridge_guard: { id: 'bridge_guard', name: 'Calm Breath', tags: ['Defense'], rank: '*', speed: 2, damage: 0, guard: 1, move: 0, hit: 'None' },
  bridge_feint: { id: 'bridge_feint', name: 'Hollow Feint', tags: ['Trick'], rank: '*', speed: 1, damage: 0, guard: 0, move: 1, hit: 'None', reduceEnemyFlow: 1 },
  disrupt_flow: { id: 'disrupt_flow', name: 'Rhythm Break', tags: ['Trick'], rank: 2, speed: 2, damage: 0, guard: 0, move: 0, hit: 'Any', reduceEnemyFlow: 2 },
  arm_snare: { id: 'arm_snare', name: 'Threaded Trap', tags: ['Trick'], rank: 2, speed: 2, damage: 0, guard: 0, move: 0, hit: 'None', arm: { name: 'Thread Snap', triggerBeatOffset: 1, damage: 2, hit: 'Near', breakOnOwnerDamaged: false, breakOnRangeChange: true } },
  flow_finisher: { id: 'flow_finisher', name: 'Flow Sever', tags: ['Attack'], rank: 3, speed: 4, damage: 2, guard: 0, move: 0, hit: 'Any', cashOutFlow: true },
  close_two: { id: 'close_two', name: 'Lunge Drive', tags: ['Trick'], rank: 3, speed: 1, damage: 0, guard: 0, move: -2, hit: 'None' },
  open_two: { id: 'open_two', name: 'Spiral Withdraw', tags: ['Trick'], rank: 3, speed: 1, damage: 0, guard: 0, move: 2, hit: 'None' },
  guard_flow: { id: 'guard_flow', name: 'Iron Rhythm', tags: ['Defense'], rank: 2, speed: 2, damage: 0, guard: 2, move: 0, hit: 'None' },
  init_snatch: { id: 'init_snatch', name: 'First Bell', tags: ['Trick'], rank: '*', speed: 1, damage: 0, guard: 0, move: 0, hit: 'None', gainInitiativeOnReveal: true },
  near_burst: { id: 'near_burst', name: 'Inside Burst', tags: ['Attack'], rank: 3, speed: 2, damage: 3, guard: 0, move: 0, hit: 'Near' },
  far_poke: { id: 'far_poke', name: 'Distant Poke', tags: ['Attack'], rank: 2, speed: 2, damage: 2, guard: 0, move: 0, hit: 'MidOrFar' },
  steady_bridge: { id: 'steady_bridge', name: 'Steady Transition', tags: ['Defense', 'Trick'], rank: '*', speed: 2, damage: 0, guard: 1, move: -1, hit: 'None' },
  punish_step: { id: 'punish_step', name: 'Punish Step', tags: ['Attack', 'Trick'], rank: 2, speed: 2, damage: 1, guard: 0, move: -1, hit: 'Near' },
  sweep_any: { id: 'sweep_any', name: 'Arc Sweep', tags: ['Attack'], rank: 1, speed: 4, damage: 1, guard: 0, move: 0, hit: 'Any' }
};

export const SHARED_POOL_IDS = Object.keys(CARDS).filter((id) => !id.startsWith('stone_') && !id.startsWith('wind_'));
