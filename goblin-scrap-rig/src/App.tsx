import { useState, useEffect, useRef } from 'react';
import './App.css';
import { ResourceHUD } from './components/ResourceHUD';
import { RigGrid } from './components/RigGrid';
import { ModuleInventory } from './components/ModuleInventory';
import type {
  GamePhase,
  GameResources,
  ResourceCaps,
  ModuleInstance,
  ModuleDef,
  Projectile,
  RewardOption,
  ResourceParticle,
  ResourceType,
} from './types';
import { BASE_MODULES } from './data/modules';
import { AFFIX_POOL } from './data/affixes';
import { runSimulationTick } from './simulation/engine';
import { runCombatTick } from './simulation/combat';
import { Arena } from './components/Arena';
import { GRID_SIZE } from './constants/rigLayout';

function App() {
  const [phase, setPhase] = useState<GamePhase>('build');
  const [currentWave, setCurrentWave] = useState(1);
  const [phaseTimer, setPhaseTimer] = useState(20);
  const [canEndCombat, setCanEndCombat] = useState(false);

  const [resources, setResources] = useState<GameResources>({
    scrap: 25,
    ammo: 10,
    heat: 0,
    baseHP: 100,
  });

  const caps: ResourceCaps = {
    scrap: 50,
    ammo: 30,
    heat: 100,
    baseHP: 100,
  };

  // Module management
  const [placedModules, setPlacedModules] = useState<ModuleInstance[]>([]);
  const [inventoryModules, setInventoryModules] = useState<ModuleInstance[]>(() => {
    // Start with 3 random modules
    return generateStarterModules();
  });

  // Helper: Generate a module instance with random affixes
  function generateModuleInstance(baseDef: Omit<ModuleDef, 'affixes'>, rarity?: string): ModuleInstance {
    const actualRarity = rarity || baseDef.rarity;
    const affixCount = actualRarity === 'rare' ? 2 : actualRarity === 'uncommon' ? 1 : Math.random() > 0.7 ? 1 : 0;

    const affixes = [];
    for (let i = 0; i < affixCount; i++) {
      const randomAffix = AFFIX_POOL[Math.floor(Math.random() * AFFIX_POOL.length)];
      affixes.push({
        affixId: randomAffix.id,
        roll: Math.random() * 0.5 + 0.75, // 0.75 to 1.25 multiplier
      });
    }

    return {
      ...baseDef,
      rarity: actualRarity as any,
      instanceId: `module-${Date.now()}-${Math.random()}`,
      affixes,
      jammed: false,
    };
  }

  function generateStarterModules(): ModuleInstance[] {
    const starter = [];
    starter.push(generateModuleInstance(BASE_MODULES[0])); // Junk Rake
    starter.push(generateModuleInstance(BASE_MODULES[2])); // Ammo Press
    starter.push(generateModuleInstance(BASE_MODULES[4])); // Pea Shooter
    return starter;
  }

  function generateRewards(wave: number): RewardOption[] {
    const rewards: RewardOption[] = [];

    // Determine rarity weights based on wave
    const rarityRoll = Math.random();
    let rarity: 'common' | 'uncommon' | 'rare' = 'common';

    if (wave <= 3) {
      rarity = rarityRoll > 0.8 ? 'uncommon' : 'common';
    } else if (wave <= 6) {
      rarity = rarityRoll > 0.6 ? 'uncommon' : rarityRoll > 0.9 ? 'rare' : 'common';
    } else {
      rarity = rarityRoll > 0.4 ? 'uncommon' : rarityRoll > 0.8 ? 'rare' : 'common';
    }

    // Always offer a module
    const randomModule = BASE_MODULES[Math.floor(Math.random() * BASE_MODULES.length)];
    const moduleInstance = generateModuleInstance(randomModule, rarity);
    rewards.push({ type: 'module', module: moduleInstance as ModuleDef });

    // Offer repair if HP is low
    if (resources.baseHP < caps.baseHP * 0.7) {
      rewards.push({ type: 'repair', amount: 20 });
    } else {
      // Otherwise offer scrap
      rewards.push({ type: 'scrap', amount: 15 });
    }

    // Third option: another module or scrap
    if (Math.random() > 0.5) {
      const randomModule2 = BASE_MODULES[Math.floor(Math.random() * BASE_MODULES.length)];
      const moduleInstance2 = generateModuleInstance(randomModule2, 'common');
      rewards.push({ type: 'module', module: moduleInstance2 as ModuleDef });
    } else {
      rewards.push({ type: 'scrap', amount: 10 });
    }

    return rewards;
  }

  // Event log
  const [eventLog, setEventLog] = useState<string[]>([]);

  // Combat state
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [resourceParticles, setResourceParticles] = useState<ResourceParticle[]>([]);
  const modulesRef = useRef<ModuleInstance[]>([]);
  const resourcesRef = useRef<GameResources>(resources);
  const projectilesRef = useRef<Projectile[]>([]);

  // Reward state
  const [rewardOptions, setRewardOptions] = useState<RewardOption[]>([]);
  const MAX_PARTICLES = 120;
  const OUTPUT_OFFSET = 0.92;
  const INTAKE_OFFSET = 0.08;
  const VACUUM_RADIUS = 0.9;
  const VACUUM_FORCE = 6;
  const CAPTURE_RADIUS = 0.15;
  const GRAVITY = 1.8;
  const DRAG = 0.985;
  const BOUNCE = 0.6;

  const getOutputPort = (module: ModuleInstance) => ({
    x: module.gridX! + OUTPUT_OFFSET,
    y: module.gridY! + 0.5,
  });

  const getIntakePort = (module: ModuleInstance) => ({
    x: module.gridX! + INTAKE_OFFSET,
    y: module.gridY! + 0.5,
  });

  const getAmmoPort = (module: ModuleInstance) => ({
    x: module.gridX! + INTAKE_OFFSET,
    y: module.gridY! + 0.5,
  });

  const spawnPlacementBurst = (module: ModuleInstance) => {
    if (module.gridX === undefined || module.gridY === undefined) return;
    if (!module.stats.scrapPerSec && !module.stats.ammoPerSec) return;

    const output = getOutputPort(module);
    const resource: ResourceType = module.stats.ammoPerSec ? 'ammo' : 'scrap';
    const baseRate = module.stats.ammoPerSec ?? module.stats.scrapPerSec ?? 1;
    const count = Math.max(2, Math.ceil(baseRate * 2));

    setResourceParticles((prev) => [
      ...prev,
      ...spawnParticlesAtPoint(resource, output.x, output.y, count, 1.6, 1),
    ].slice(-MAX_PARTICLES));
  };

  const spawnParticlesAtPoint = (
    resource: ResourceType,
    x: number,
    y: number,
    count: number,
    baseSpeed: number,
    directionX: number
  ) => {
    const particles: ResourceParticle[] = [];
    for (let i = 0; i < count; i++) {
      const speed = baseSpeed + Math.random() * 0.6;
      particles.push({
        id: `particle-${Date.now()}-${Math.random()}`,
        resource,
        x,
        y,
        vx: speed * directionX + (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.5,
        size: 5 + Math.random() * 4,
        createdAt: performance.now(),
      });
    }
    return particles;
  };

  const spawnParticlesFromEvents = (
    events: { type: string; data?: any }[],
    modules: ModuleInstance[]
  ) => {
    const particles: ResourceParticle[] = [];
    events.forEach((event) => {
      if (event.type !== 'Produce' || !event.data?.moduleId || !event.data?.resource) return;
      const resource = event.data.resource as ResourceType;
      if (resource !== 'scrap' && resource !== 'ammo') return;
      const module = modules.find((mod) => mod.instanceId === event.data.moduleId);
      if (!module || module.gridX === undefined || module.gridY === undefined) return;
      const amount = Math.max(0.1, event.data.amount ?? 1);
      const count = Math.max(1, Math.ceil(amount));
      const output = getOutputPort(module);
      particles.push(...spawnParticlesAtPoint(resource, output.x, output.y, count, 1.4, 1));

      if (module.kind === 'converter' && resource === 'ammo' && module.stats.scrapToAmmoRate) {
        const intake = getIntakePort(module);
        const intakeX = Math.max(0, intake.x - 0.2);
        const intakeCount = Math.max(1, Math.ceil(amount));
        particles.push(...spawnParticlesAtPoint('scrap', intakeX, intake.y, intakeCount, 1.1, 1));
      }
    });

    return particles;
  };

  const updateParticles = (
    particles: ResourceParticle[],
    deltaTime: number,
    modules: ModuleInstance[],
    now: number
  ) => {
    const converters = modules.filter(
      (module) => module.kind === 'converter' && module.gridX !== undefined && module.gridY !== undefined
    );
    const spenders = modules.filter(
      (module) => module.kind === 'spender' && module.gridX !== undefined && module.gridY !== undefined
    );
    const intakePorts = converters.map((module) => getIntakePort(module));
    const ammoPorts = spenders.map((module) => getAmmoPort(module));
    return particles
      .map((particle) => {
        let { x, y, vx, vy } = particle;
        const targets = particle.resource === 'scrap' ? intakePorts : ammoPorts;
        if (targets.length > 0) {
          let closest: { x: number; y: number } | null = null;
          let closestDist = Infinity;
          targets.forEach((port) => {
            const dx = port.x - x;
            const dy = port.y - y;
            const dist = Math.hypot(dx, dy);
            if (dist < closestDist) {
              closestDist = dist;
              closest = port;
            }
          });

          if (closest && closestDist < VACUUM_RADIUS) {
            const dx = closest.x - x;
            const dy = closest.y - y;
            const dist = Math.max(0.001, Math.hypot(dx, dy));
            const pull = (VACUUM_RADIUS - dist) / VACUUM_RADIUS;
            vx += (dx / dist) * VACUUM_FORCE * pull * deltaTime;
            vy += (dy / dist) * VACUUM_FORCE * pull * deltaTime;
            if (dist < CAPTURE_RADIUS) {
              return null;
            }
          }
        }

        vy += GRAVITY * deltaTime;
        vx *= DRAG;
        vy *= DRAG;
        x += vx * deltaTime;
        y += vy * deltaTime;

        if (x < 0) {
          x = 0;
          vx = -vx * BOUNCE;
        } else if (x > GRID_SIZE) {
          x = GRID_SIZE;
          vx = -vx * BOUNCE;
        }

        if (y < 0) {
          y = 0;
          vy = -vy * BOUNCE;
        } else if (y > GRID_SIZE) {
          y = GRID_SIZE;
          vy = -vy * BOUNCE;
        }

        if (now - particle.createdAt > 6000) {
          return null;
        }

        return {
          ...particle,
          x,
          y,
          vx,
          vy,
        };
      })
      .filter((particle): particle is ResourceParticle => particle !== null);
  };

  // Phase timer countdown
  useEffect(() => {
    if (phase === 'gameOver' || phase === 'reward') return;

    const interval = setInterval(() => {
      setPhaseTimer((prev) => {
        if (prev <= 1) {
          // Phase transition
          if (phase === 'build') {
            setPhase('combat');
            return 60; // Combat phase duration
          } else if (phase === 'combat') {
            // Generate rewards before transitioning
            setRewardOptions(generateRewards(currentWave));
            setPhase('reward');
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentWave, resources.baseHP, caps.baseHP]);

  useEffect(() => {
    modulesRef.current = placedModules;
  }, [placedModules]);

  useEffect(() => {
    resourcesRef.current = resources;
  }, [resources]);

  useEffect(() => {
    projectilesRef.current = projectiles;
  }, [projectiles]);

  useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();

    const step = (time: number) => {
      const deltaTime = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      setResourceParticles((prev) =>
        updateParticles(prev, deltaTime, modulesRef.current, time).slice(-MAX_PARTICLES)
      );
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (phase === 'reward' || phase === 'gameOver') {
      setResourceParticles([]);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'combat') {
      setCanEndCombat(false);
    }
  }, [phase]);

  // Simulation tick (0.25s fixed tick)
  useEffect(() => {
    // Run simulation in both build and combat phases for testing
    if (phase === 'gameOver' || phase === 'reward') return;

    const TICK_MS = 250; // 0.25 seconds
    const DELTA_TIME = 0.25;

    const interval = setInterval(() => {
      const result = runSimulationTick(
        {
          resources: resourcesRef.current,
          modules: modulesRef.current,
          deltaTime: DELTA_TIME,
        },
        caps
      );

      resourcesRef.current = result.resources;
      modulesRef.current = result.modules;
      setResources(result.resources);
      setPlacedModules(result.modules);
      setResourceParticles((prev) => [
        ...prev,
        ...spawnParticlesFromEvents(result.events, result.modules),
      ].slice(-MAX_PARTICLES));

      // Update event log (keep last 20 events)
      if (result.events.length > 0) {
        setEventLog((prev) => {
          const newLog = [...result.events.map((e) => e.message), ...prev];
          return newLog.slice(0, 20);
        });
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [phase, caps]);

  // Combat tick (runs during combat phase for turret firing)
  useEffect(() => {
    if (phase !== 'combat') return;

    const TICK_MS = 100; // 0.1 seconds for smoother combat
    const DELTA_TIME = 0.1;

    const interval = setInterval(() => {
      const result = runCombatTick(
        {
          resources: resourcesRef.current,
          modules: modulesRef.current,
          projectiles: projectilesRef.current,
          deltaTime: DELTA_TIME,
        },
        caps
      );

      resourcesRef.current = result.resources;
      projectilesRef.current = result.projectiles;
      setResources(result.resources);
      setProjectiles(result.projectiles);

      // Update event log
      if (result.events.length > 0) {
        setEventLog((prev) => {
          const newLog = [...result.events.map((e) => e.message), ...prev];
          return newLog.slice(0, 20);
        });
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [phase, caps]);

  const handleRewardChoice = (reward: RewardOption) => {
    // Apply reward
    if (reward.type === 'module' && reward.module) {
      setInventoryModules((prev) => [...prev, reward.module as unknown as ModuleInstance]);
    } else if (reward.type === 'repair' && reward.amount) {
      setResources((prev) => ({
        ...prev,
        baseHP: Math.min(prev.baseHP + (reward.amount || 0), caps.baseHP),
      }));
    } else if (reward.type === 'scrap' && reward.amount) {
      setResources((prev) => ({
        ...prev,
        scrap: Math.min(prev.scrap + (reward.amount || 0), caps.scrap),
      }));
    }

    // Proceed to next wave or game over
    if (currentWave >= 9) {
      setPhase('gameOver');
    } else {
      setCurrentWave((w) => w + 1);
      setPhase('build');
      setPhaseTimer(20);
      setCanEndCombat(false);
    }
  };

  // Module handlers
  const handleModulePlaced = (module: ModuleInstance, x: number, y: number) => {
    // Remove from inventory
    setInventoryModules((prev) => prev.filter((m) => m.instanceId !== module.instanceId));
    // Add to placed with position
    const placedModule = { ...module, gridX: x, gridY: y };
    setPlacedModules((prev) => [...prev, placedModule]);
    spawnPlacementBurst(placedModule);
  };

  const handleModuleMoved = (moduleId: string, x: number, y: number) => {
    setPlacedModules((prev) =>
      prev.map((m) =>
        m.instanceId === moduleId ? { ...m, gridX: x, gridY: y } : m
      )
    );
  };

  const handleModuleRemoved = (moduleId: string) => {
    const module = placedModules.find((m) => m.instanceId === moduleId);
    if (!module) return;

    // Remove from placed
    setPlacedModules((prev) => prev.filter((m) => m.instanceId !== moduleId));
    // Add back to inventory (remove grid position)
    const { gridX, gridY, ...moduleWithoutPos } = module;
    setInventoryModules((prev) => [...prev, moduleWithoutPos as ModuleInstance]);
  };

  const handleModuleSalvaged = (moduleId: string) => {
    const module = inventoryModules.find((m) => m.instanceId === moduleId);
    if (!module) return;

    // Remove from inventory
    setInventoryModules((prev) => prev.filter((m) => m.instanceId !== moduleId));
    // Give scrap based on rarity
    const scrapGain = module.rarity === 'rare' ? 15 : module.rarity === 'uncommon' ? 10 : 5;
    setResources((prev) => ({ ...prev, scrap: Math.min(prev.scrap + scrapGain, caps.scrap) }));
  };

  // Combat handlers
  const handleBaseHit = (damage: number) => {
    setResources((prev) => ({
      ...prev,
      baseHP: Math.max(0, prev.baseHP - damage),
    }));

    setEventLog((prev) => [`⚠️ Base took ${damage} damage!`, ...prev].slice(0, 20));

    // Check game over
    setResources((prev) => {
      if (prev.baseHP <= 0) {
        setPhase('gameOver');
      }
      return prev;
    });
  };

  const handleEnemyKilled = (_enemyId: string) => {
    // Give scrap for kill
    setResources((prev) => ({
      ...prev,
      scrap: Math.min(prev.scrap + 1, caps.scrap),
    }));

    setEventLog((prev) => [`💀 Enemy killed +1 scrap`, ...prev].slice(0, 20));
  };

  const handleStartRound = () => {
    setPhase('combat');
    setPhaseTimer(60);
    setCanEndCombat(false);
  };

  const handleEndRound = () => {
    setRewardOptions(generateRewards(currentWave));
    setPhase('reward');
    setPhaseTimer(0);
    setCanEndCombat(false);
  };

  return (
    <div className="app">
      <ResourceHUD
        resources={resources}
        caps={caps}
        phaseTimer={phaseTimer}
        currentWave={currentWave}
        showStartRound={phase === 'build'}
        showEndRound={phase === 'combat' && canEndCombat}
        onStartRound={handleStartRound}
        onEndRound={handleEndRound}
      />

      <div className="game-container">
        {phase === 'build' && (
          <div className="build-phase">
            <div className="phase-title brass-accent">
              ⚙️ BUILD PHASE - Configure Your Rig
            </div>
            <div className="build-content">
              <div className="rig-section panel">
                <h3>Rig Grid (5×5)</h3>
                <RigGrid
                  modules={placedModules}
                  resourceParticles={resourceParticles}
                  onModulePlaced={handleModulePlaced}
                  onModuleRemoved={handleModuleRemoved}
                  onModuleMoved={handleModuleMoved}
                />
              </div>
              <div className="inventory-section panel">
                <h3>Inventory ({inventoryModules.length})</h3>
                <ModuleInventory
                  modules={inventoryModules}
                  onSalvage={handleModuleSalvaged}
                />
              </div>
            </div>
          </div>
        )}

        {phase === 'combat' && (
          <div className="combat-phase">
            <div className="phase-title brass-accent">
              ⚔️ COMBAT PHASE - Defend Your Base!
            </div>
            <div className="combat-content">
              <div className="arena-container panel">
                <Arena
                  currentWave={currentWave}
                  onBaseHit={handleBaseHit}
                  onEnemyKilled={handleEnemyKilled}
                  onWaveCleared={() => setCanEndCombat(true)}
                  projectiles={projectiles}
                  turrets={placedModules}
                  isActive={phase === 'combat'}
                />
              </div>
              <div className="combat-sidebar panel">
                <h3>Event Log</h3>
                <div className="event-log">
                  {eventLog.length === 0 && (
                    <div style={{ opacity: 0.5 }}>No events yet...</div>
                  )}
                  {eventLog.map((event, idx) => (
                    <div key={idx} style={{ marginBottom: '4px', opacity: Math.max(0.3, 1 - idx * 0.05) }}>
                      {event}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'reward' && (
          <div className="reward-phase">
            <div className="phase-title brass-accent">
              🎁 WAVE {currentWave} COMPLETE - Choose Reward
            </div>
            <div className="reward-cards">
              {rewardOptions.map((reward, idx) => {
                const getRarityColor = (r: string) =>
                  r === 'rare' ? 'var(--rare)' : r === 'uncommon' ? 'var(--uncommon)' : 'var(--common)';

                return (
                  <div
                    key={idx}
                    className="reward-card panel"
                    onClick={() => handleRewardChoice(reward)}
                    style={{
                      borderColor: reward.module ? getRarityColor(reward.module.rarity) : 'var(--brass-dark)',
                    }}
                  >
                    {reward.type === 'module' && reward.module && (
                      <>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                          {reward.module.art.icon}
                        </div>
                        <h3 style={{ color: getRarityColor(reward.module.rarity) }}>
                          {reward.module.name}
                        </h3>
                        <p style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>
                          {reward.module.rarity.toUpperCase()}
                        </p>
                        {reward.module.affixes && reward.module.affixes.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '11px' }}>
                            {reward.module.affixes.map((a, i) => (
                              <div key={i} style={{ color: 'var(--brass)' }}>
                                +{a.affixId}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {reward.type === 'repair' && (
                      <>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔧</div>
                        <h3>Repair</h3>
                        <p>+{reward.amount} Base HP</p>
                      </>
                    )}
                    {reward.type === 'scrap' && (
                      <>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⛏️</div>
                        <h3>Scrap Pile</h3>
                        <p>+{reward.amount} Scrap</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'gameOver' && (
          <div className="game-over">
            <div className="phase-title brass-accent">
              💥 RUN COMPLETE
            </div>
            <div className="game-over-stats">
              <p>Waves Survived: {currentWave}</p>
              <button onClick={() => window.location.reload()}>
                NEW RUN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
