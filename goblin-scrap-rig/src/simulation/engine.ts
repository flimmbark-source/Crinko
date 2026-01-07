import type { ModuleInstance, GameResources, ResourceCaps } from '../types';

export interface SimulationState {
  resources: GameResources;
  modules: ModuleInstance[];
  deltaTime: number; // in seconds (0.25 for fixed tick)
}

export interface SimulationResult {
  resources: GameResources;
  modules: ModuleInstance[];
  events: Array<{
    type: string;
    message: string;
    data?: any;
  }>;
}

export function runSimulationTick(
  state: SimulationState,
  caps: ResourceCaps
): SimulationResult {
  const { resources, modules, deltaTime } = state;
  const newResources = { ...resources };
  const newModules = [...modules];
  const events: SimulationResult['events'] = [];

  // Process each module
  for (let i = 0; i < newModules.length; i++) {
    const module = newModules[i];

    // Skip if jammed
    if (module.jammed) {
      // Check if jam should clear
      if (module.jammedUntil && Date.now() >= module.jammedUntil) {
        newModules[i] = { ...module, jammed: false, jammedUntil: undefined };
        events.push({
          type: 'JamClear',
          message: `${module.name} unjammed`,
          data: { moduleId: module.instanceId },
        });
      }
      continue;
    }

    // Only process placed modules
    if (module.gridX === undefined || module.gridY === undefined) continue;

    // INPUT: Generate scrap
    if (module.stats.scrapPerSec) {
      const scrapGenerated = module.stats.scrapPerSec * deltaTime;
      newResources.scrap = Math.min(newResources.scrap + scrapGenerated, caps.scrap);
      events.push({
        type: 'Produce',
        message: `+${scrapGenerated.toFixed(1)} scrap from ${module.name}`,
        data: { resource: 'scrap', amount: scrapGenerated, moduleId: module.instanceId },
      });
    }

    // CONVERTER: Scrap to Ammo
    if (module.stats.scrapToAmmoRate) {
      const scrapNeeded = module.stats.scrapToAmmoRate * deltaTime;
      if (newResources.scrap >= scrapNeeded && newResources.ammo < caps.ammo) {
        newResources.scrap -= scrapNeeded;
        const ammoProduced = 1 * deltaTime;
        newResources.ammo = Math.min(newResources.ammo + ammoProduced, caps.ammo);

        // Add heat
        if (module.stats.heatPerAction) {
          newResources.heat = Math.min(
            newResources.heat + module.stats.heatPerAction * deltaTime,
            caps.heat
          );
        }

        events.push({
          type: 'Produce',
          message: `+${ammoProduced.toFixed(1)} ammo from ${module.name}`,
          data: { resource: 'ammo', amount: ammoProduced, moduleId: module.instanceId },
        });
      }
    }

    // COOLING: Reduce heat
    if (module.stats.coolingPerSec) {
      const heatReduced = module.stats.coolingPerSec * deltaTime;
      const actualReduction = Math.min(heatReduced, newResources.heat);
      newResources.heat = Math.max(0, newResources.heat - heatReduced);

      if (actualReduction > 0) {
        events.push({
          type: 'HeatReduced',
          message: `-${actualReduction.toFixed(1)} heat from ${module.name}`,
          data: { amount: actualReduction, moduleId: module.instanceId },
        });
      }
    }
  }

  // JAM SYSTEM: Check for jams when heat is high
  if (newResources.heat >= 80) {
    const jamChance = newResources.heat >= 90 ? 0.05 : 0.02; // 5% or 2% per tick
    if (Math.random() < jamChance) {
      // Pick a random non-cooling module to jam
      const jammableModules = newModules.filter(
        (m) =>
          !m.jammed &&
          m.gridX !== undefined &&
          !m.stats.coolingPerSec &&
          m.kind !== 'stabilizer'
      );

      if (jammableModules.length > 0) {
        const toJam = jammableModules[Math.floor(Math.random() * jammableModules.length)];
        const index = newModules.findIndex((m) => m.instanceId === toJam.instanceId);
        newModules[index] = {
          ...toJam,
          jammed: true,
          jammedUntil: Date.now() + 2500, // 2.5 seconds
        };

        events.push({
          type: 'JamStart',
          message: `💥 ${toJam.name} JAMMED!`,
          data: { moduleId: toJam.instanceId },
        });
      }
    }
  }

  return {
    resources: newResources,
    modules: newModules,
    events,
  };
}
