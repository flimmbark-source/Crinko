export interface EnemyDef {
  type: string;
  hp: number;
  speed: number;
  damage: number;
  color: string;
  size: number;
}

export const ENEMY_TYPES: Record<string, EnemyDef> = {
  swarmer: {
    type: 'swarmer',
    hp: 15,
    speed: 60, // pixels per second
    damage: 10,
    color: '#ff6b6b',
    size: 12,
  },
  brute: {
    type: 'brute',
    hp: 80,
    speed: 30,
    damage: 25,
    color: '#ee5a6f',
    size: 24,
  },
  sapper: {
    type: 'sapper',
    hp: 30,
    speed: 45,
    damage: 15,
    color: '#f4a261',
    size: 16,
  },
  heatLeech: {
    type: 'heatLeech',
    hp: 25,
    speed: 40,
    damage: 8,
    color: '#ff6b35',
    size: 14,
  },
};

export interface WaveConfig {
  wave: number;
  enemies: Array<{
    type: string;
    count: number;
    spawnInterval: number; // seconds between spawns
  }>;
}

export const WAVE_CONFIGS: WaveConfig[] = [
  // Wave 1
  {
    wave: 1,
    enemies: [{ type: 'swarmer', count: 8, spawnInterval: 1.5 }],
  },
  // Wave 2
  {
    wave: 2,
    enemies: [
      { type: 'swarmer', count: 10, spawnInterval: 1.2 },
      { type: 'brute', count: 1, spawnInterval: 3 },
    ],
  },
  // Wave 3
  {
    wave: 3,
    enemies: [
      { type: 'swarmer', count: 12, spawnInterval: 1 },
      { type: 'sapper', count: 3, spawnInterval: 2.5 },
    ],
  },
  // Wave 4
  {
    wave: 4,
    enemies: [
      { type: 'swarmer', count: 15, spawnInterval: 0.8 },
      { type: 'brute', count: 2, spawnInterval: 4 },
      { type: 'heatLeech', count: 2, spawnInterval: 3 },
    ],
  },
  // Wave 5
  {
    wave: 5,
    enemies: [
      { type: 'swarmer', count: 18, spawnInterval: 0.7 },
      { type: 'sapper', count: 5, spawnInterval: 2 },
      { type: 'brute', count: 2, spawnInterval: 3.5 },
    ],
  },
  // Wave 6
  {
    wave: 6,
    enemies: [
      { type: 'swarmer', count: 20, spawnInterval: 0.6 },
      { type: 'heatLeech', count: 4, spawnInterval: 2.5 },
      { type: 'brute', count: 3, spawnInterval: 3 },
    ],
  },
  // Wave 7
  {
    wave: 7,
    enemies: [
      { type: 'swarmer', count: 25, spawnInterval: 0.5 },
      { type: 'sapper', count: 6, spawnInterval: 1.8 },
      { type: 'brute', count: 3, spawnInterval: 2.5 },
      { type: 'heatLeech', count: 3, spawnInterval: 2 },
    ],
  },
  // Wave 8
  {
    wave: 8,
    enemies: [
      { type: 'swarmer', count: 30, spawnInterval: 0.4 },
      { type: 'brute', count: 5, spawnInterval: 2 },
      { type: 'heatLeech', count: 5, spawnInterval: 1.5 },
    ],
  },
  // Wave 9 (Boss)
  {
    wave: 9,
    enemies: [
      { type: 'brute', count: 8, spawnInterval: 2.5 },
      { type: 'swarmer', count: 40, spawnInterval: 0.3 },
    ],
  },
];
