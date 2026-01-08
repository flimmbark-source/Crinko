// Core type definitions for Goblin Scrap Rig

export type ResourceType = "scrap" | "ammo";

export type ModuleKind = "input" | "converter" | "spender" | "stabilizer" | "wildcard";

export type Rarity = "common" | "uncommon" | "rare";

export type TriggerType =
  | "OnProduce"
  | "OnHeatReduced"
  | "OnHit"
  | "OnKill"
  | "OnJamStart"
  | "OnJamClear"
  | "OnSpend"
  | "OnShotFired";

export interface ModuleStats {
  scrapPerSec?: number;
  ammoPerSec?: number;
  scrapToAmmoRate?: number; // scrap consumed per tick to produce ammo
  coolingPerSec?: number;
  ammoPerShot?: number;
  damage?: number;
  fireRate?: number; // shots per sec
  heatPerAction?: number;
  range?: number;
}

export interface AuraDef {
  type: "jamResist";
  amount: number;
  radius: number;
}

export interface AffixDef {
  id: string;
  name: string;
  trigger: TriggerType;
  params: Record<string, number | string>;
  description: string;
}

export interface AffixInstance {
  affixId: string;
  roll: number;
}

export interface WeaponConfig {
  visualType: WeaponVisualType;
  color: string;
  speed: number;
  aoeRadius?: number;
  piercing?: boolean;
}

export interface ModuleDef {
  id: string;
  name: string;
  kind: ModuleKind;
  rarity: Rarity;
  stats: ModuleStats;
  auras?: AuraDef[];
  affixes: AffixInstance[];
  art: {
    icon: string;
    colorHint: string;
  };
  weaponConfig?: WeaponConfig;
}

export interface ModuleInstance extends ModuleDef {
  instanceId: string; // unique per placed module
  gridX?: number;
  gridY?: number;
  jammed: boolean;
  jammedUntil?: number;
}

export interface GameResources {
  scrap: number;
  ammo: number;
  heat: number;
  baseHP: number;
}

export interface ResourceCaps {
  scrap: number;
  ammo: number;
  heat: number;
  baseHP: number;
}

export type GamePhase = "build" | "combat" | "reward" | "gameOver";

export interface Enemy {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHP: number;
  speed: number;
  damage: number;
  alive: boolean;
}

export type WeaponVisualType = 'hitscan' | 'projectile' | 'arc' | 'explosive';

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  damage: number;
  turretId: string;
  speed: number;
  weaponId: string; // weapon type identifier
  visualType: WeaponVisualType;
  color?: string; // custom projectile color
  aoeRadius?: number; // explosion radius
  piercing?: boolean; // can hit multiple enemies
  startTime?: number; // for hitscan beam duration
}

export interface GameEvent {
  type: TriggerType;
  data: any;
  timestamp: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: number;
}

export interface WaveConfig {
  wave: number;
  enemies: Array<{
    type: string;
    count: number;
    spawnDelay: number;
  }>;
}

export interface RewardOption {
  type: "module" | "repair" | "scrap";
  module?: ModuleDef;
  amount?: number;
}

export interface ResourceParticle {
  id: string;
  resource: ResourceType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  createdAt: number;
}
