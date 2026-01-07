import type { ModuleDef } from '../types';

// Base module definitions without affixes (affixes are rolled on drop)
export const BASE_MODULES: Omit<ModuleDef, 'affixes'>[] = [
  // INPUTS
  {
    id: 'junk-rake',
    name: 'Junk Rake',
    kind: 'input',
    rarity: 'common',
    stats: {
      scrapPerSec: 2,
    },
    art: {
      icon: '⛏️',
      colorHint: '#888',
    },
  },
  {
    id: 'loot-vacuum',
    name: 'Loot Vacuum',
    kind: 'input',
    rarity: 'uncommon',
    stats: {
      scrapPerSec: 0.5, // Low passive, gets bonus on kill (via affix)
    },
    art: {
      icon: '💨',
      colorHint: '#60a5fa',
    },
  },

  // CONVERTERS
  {
    id: 'ammo-press',
    name: 'Ammo Press',
    kind: 'converter',
    rarity: 'common',
    stats: {
      scrapToAmmoRate: 2, // Consumes 2 scrap per tick to make 1 ammo
      heatPerAction: 3,
    },
    art: {
      icon: '⚙️',
      colorHint: '#9ca3af',
    },
  },
  {
    id: 'coolant-still',
    name: 'Coolant Still',
    kind: 'converter',
    rarity: 'uncommon',
    stats: {
      coolingPerSec: 5,
      scrapToAmmoRate: 0.5, // Very light scrap consumption for cooling
    },
    art: {
      icon: '❄️',
      colorHint: '#4a90e2',
    },
  },

  // SPENDERS (Turrets)
  {
    id: 'pea-shooter',
    name: 'Pea Shooter',
    kind: 'spender',
    rarity: 'common',
    stats: {
      damage: 8,
      fireRate: 2, // 2 shots/sec
      ammoPerShot: 1,
      heatPerAction: 1,
      range: 150,
    },
    art: {
      icon: '🔫',
      colorHint: '#9ca3af',
    },
  },
  {
    id: 'scrap-cannon',
    name: 'Scrap Cannon',
    kind: 'spender',
    rarity: 'uncommon',
    stats: {
      damage: 25,
      fireRate: 0.5, // 1 shot every 2 seconds
      ammoPerShot: 3,
      heatPerAction: 5,
      range: 200,
    },
    art: {
      icon: '💥',
      colorHint: '#60a5fa',
    },
  },
  {
    id: 'shrapnel-mortar',
    name: 'Shrapnel Mortar',
    kind: 'spender',
    rarity: 'rare',
    stats: {
      damage: 18,
      fireRate: 1,
      ammoPerShot: 2,
      heatPerAction: 4,
      range: 180,
    },
    art: {
      icon: '🎆',
      colorHint: '#a855f7',
    },
  },

  // STABILIZERS
  {
    id: 'bellows-vent',
    name: 'Bellows Vent',
    kind: 'stabilizer',
    rarity: 'common',
    stats: {
      coolingPerSec: 8,
    },
    art: {
      icon: '🌬️',
      colorHint: '#9ca3af',
    },
  },
  {
    id: 'leaky-barrel',
    name: 'Leaky Barrel',
    kind: 'stabilizer',
    rarity: 'uncommon',
    stats: {
      coolingPerSec: 12,
    },
    art: {
      icon: '🛢️',
      colorHint: '#60a5fa',
    },
  },
  {
    id: 'grease-goblin',
    name: 'Grease Goblin',
    kind: 'stabilizer',
    rarity: 'rare',
    stats: {
      coolingPerSec: 6,
    },
    auras: [
      {
        type: 'jamResist',
        amount: 20,
        radius: 1,
      },
    ],
    art: {
      icon: '👺',
      colorHint: '#a855f7',
    },
  },

  // WILDCARDS
  {
    id: 'ricochet-plate',
    name: 'Ricochet Plate',
    kind: 'wildcard',
    rarity: 'uncommon',
    stats: {},
    art: {
      icon: '🛡️',
      colorHint: '#60a5fa',
    },
  },
  {
    id: 'jam-engine',
    name: 'Jam Engine',
    kind: 'wildcard',
    rarity: 'rare',
    stats: {},
    art: {
      icon: '⚡',
      colorHint: '#a855f7',
    },
  },
];
