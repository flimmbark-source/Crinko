import type { AffixDef } from '../types';

export const AFFIX_POOL: AffixDef[] = [
  // AMMO PRODUCTION AFFIXES
  {
    id: 'hot-rounds',
    name: 'Hot Rounds',
    trigger: 'OnProduce',
    params: { resource: 'ammo', burnDamage: 2 },
    description: 'Shots apply +2 burn damage',
  },
  {
    id: 'overpack',
    name: 'Overpack',
    trigger: 'OnProduce',
    params: { resource: 'ammo', threshold: 10, capBonus: 1 },
    description: 'Every 10 ammo → +1 max ammo this wave',
  },
  {
    id: 'stamped-quality',
    name: 'Stamped Quality',
    trigger: 'OnProduce',
    params: { resource: 'ammo', critChanceBonus: 0.02 },
    description: 'Ammo produced → +2% crit chance',
  },

  // HEAT REDUCTION AFFIXES
  {
    id: 'thermal-reclaim',
    name: 'Thermal Reclaim',
    trigger: 'OnHeatReduced',
    params: { scrapPerHeat: 0.125 },
    description: 'Heat reduced → gain scrap',
  },
  {
    id: 'cooling-feedback',
    name: 'Cooling Feedback',
    trigger: 'OnHeatReduced',
    params: { fireRateBonus: 0.15, duration: 1.5 },
    description: 'Heat reduced → +15% fire rate for 1.5s',
  },

  // HIT-BASED AFFIXES
  {
    id: 'siphon-tip',
    name: 'Siphon Tip',
    trigger: 'OnHit',
    params: { threshold: 7, scrapGain: 1 },
    description: 'Every 7 hits → gain +1 scrap',
  },
  {
    id: 'shrap-sticker',
    name: 'Shrap Sticker',
    trigger: 'OnHit',
    params: { chance: 0.15, splashDamage: 5, radius: 30 },
    description: '15% chance on hit → AoE splash',
  },

  // JAM-BASED AFFIXES
  {
    id: 'angry-hammer',
    name: 'Angry Hammer',
    trigger: 'OnJamStart',
    params: { damageBonus: 0.25, duration: 3 },
    description: 'On jam → turrets +25% damage for 3s',
  },
  {
    id: 'jam-farmer',
    name: 'Jam Farmer',
    trigger: 'OnJamStart',
    params: { ammoGain: 2 },
    description: 'On jam → generate +2 ammo',
  },

  // SPEND-BASED AFFIXES
  {
    id: 'efficient-loader',
    name: 'Efficient Loader',
    trigger: 'OnSpend',
    params: { resource: 'ammo', refundChance: 0.1 },
    description: '10% chance to refund 1 ammo on spend',
  },
  {
    id: 'backblast',
    name: 'Backblast',
    trigger: 'OnSpend',
    params: { resource: 'ammo', knockbackRadius: 40 },
    description: 'Ammo spent → small knockback pulse',
  },

  // KILL-BASED AFFIXES
  {
    id: 'scrap-harvest',
    name: 'Scrap Harvest',
    trigger: 'OnKill',
    params: { scrapGain: 2 },
    description: 'On kill → gain +2 scrap',
  },
  {
    id: 'kill-heat',
    name: 'Kill Heat',
    trigger: 'OnKill',
    params: { heatReduced: 5 },
    description: 'On kill → reduce heat by 5',
  },
];
