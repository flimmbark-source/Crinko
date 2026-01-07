import type { ModuleInstance, GameResources, ResourceCaps, Projectile, Enemy } from '../types';

export interface CombatState {
  resources: GameResources;
  modules: ModuleInstance[];
  projectiles: Projectile[];
  deltaTime: number;
}

export interface CombatResult {
  resources: GameResources;
  projectiles: Projectile[];
  events: Array<{
    type: string;
    message: string;
    data?: any;
  }>;
}

// Get enemies from the Arena component (via window global)
function getEnemies(): Enemy[] {
  return (window as any).__arenaEnemies || [];
}

function setEnemies(enemies: Enemy[]) {
  if ((window as any).__setArenaEnemies) {
    (window as any).__setArenaEnemies(enemies);
  }
}

export function runCombatTick(state: CombatState, caps: ResourceCaps): CombatResult {
  const { resources, modules, projectiles, deltaTime } = state;
  const newResources = { ...resources };
  const events: CombatResult['events'] = [];
  const enemies = getEnemies();

  // Find all turret modules
  const turrets = modules.filter(
    (m) =>
      m.kind === 'spender' &&
      m.gridX !== undefined &&
      m.gridY !== undefined &&
      !m.jammed &&
      m.stats.damage !== undefined
  );

  // Update existing projectiles
  const updatedProjectiles: Projectile[] = [];

  for (const proj of projectiles) {
    // Handle hitscan beams (visual only, damage already applied)
    if (proj.visualType === 'hitscan') {
      // Remove beam after 100ms
      if (proj.startTime && Date.now() - proj.startTime < 100) {
        updatedProjectiles.push(proj);
      }
      continue;
    }

    // Move projectile toward target
    const dx = proj.targetX - proj.x;
    const dy = proj.targetY - proj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < proj.speed * deltaTime) {
      // Hit! Handle different projectile types
      if (proj.aoeRadius) {
        // AoE explosion - damage all enemies in radius
        enemies.forEach((e) => {
          if (!e.alive) return;
          const ex = e.x - proj.targetX;
          const ey = e.y - proj.targetY;
          const dist = Math.sqrt(ex * ex + ey * ey);

          if (dist < proj.aoeRadius!) {
            e.hp -= proj.damage;

            if (e.hp <= 0) {
              e.alive = false;
            }

            events.push({
              type: 'Hit',
              message: `💥 Explosion hit for ${proj.damage} damage`,
              data: { damage: proj.damage, turretId: proj.turretId, enemyId: e.id },
            });
          }
        });

        // Update enemies in window
        setEnemies([...enemies]);
      } else if (proj.piercing) {
        // Piercing - damage all enemies along the path
        enemies.forEach((e) => {
          if (!e.alive) return;
          const ex = e.x - proj.x;
          const ey = e.y - proj.y;
          const distToEnemy = Math.sqrt(ex * ex + ey * ey);

          // Check if enemy is close to projectile path
          if (distToEnemy < 25) {
            e.hp -= proj.damage;

            if (e.hp <= 0) {
              e.alive = false;
            }

            events.push({
              type: 'Hit',
              message: `⚡ Piercing hit for ${proj.damage} damage`,
              data: { damage: proj.damage, turretId: proj.turretId, enemyId: e.id },
            });
          }
        });

        // Update enemies in window
        setEnemies([...enemies]);
      } else {
        // Standard projectile - single target
        const hitEnemy = enemies.find((e) => {
          const ex = e.x - proj.targetX;
          const ey = e.y - proj.targetY;
          return Math.sqrt(ex * ex + ey * ey) < 20 && e.alive;
        });

        if (hitEnemy) {
          hitEnemy.hp -= proj.damage;

          if (hitEnemy.hp <= 0) {
            hitEnemy.alive = false;
          }

          events.push({
            type: 'Hit',
            message: `Hit for ${proj.damage} damage`,
            data: { damage: proj.damage, turretId: proj.turretId, enemyId: hitEnemy.id },
          });

          // Update enemies in window
          setEnemies([...enemies]);
        }
      }
    } else {
      // Continue moving
      const moveX = (dx / distance) * proj.speed * deltaTime;
      const moveY = (dy / distance) * proj.speed * deltaTime;

      updatedProjectiles.push({
        ...proj,
        x: proj.x + moveX,
        y: proj.y + moveY,
      });
    }
  }

  // Turret firing
  for (const turret of turrets) {
    if (!turret.stats.fireRate || !turret.stats.ammoPerShot || !turret.stats.damage) continue;

    // Check cooldown (simple: each turret can fire based on fireRate)
    // For prototype, we'll fire if we have ammo and enemies exist
    const canFire = newResources.ammo >= turret.stats.ammoPerShot && enemies.length > 0;

    if (canFire) {
      // Get turret position from arena (set during render)
      const turretX = (turret as any).__arenaX || 300;
      const turretY = (turret as any).__arenaY || 400;

      let nearestEnemy: Enemy | null = null;
      let nearestDistance = Infinity;

      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - turretX;
        const dy = enemy.y - turretY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (turret.stats.range || 200) && distance < nearestDistance) {
          nearestEnemy = enemy;
          nearestDistance = distance;
        }
      }

      if (nearestEnemy) {
        // Consume ammo
        newResources.ammo -= turret.stats.ammoPerShot;

        // Add heat
        if (turret.stats.heatPerAction) {
          newResources.heat = Math.min(
            newResources.heat + turret.stats.heatPerAction,
            caps.heat
          );
        }

        // Get weapon config or use defaults
        const weaponConfig = turret.weaponConfig || {
          visualType: 'projectile' as const,
          color: '#f4cf57',
          speed: 400,
        };

        // Handle hitscan weapons (instant hit)
        if (weaponConfig.visualType === 'hitscan') {
          // Instant damage
          nearestEnemy.hp -= turret.stats.damage;

          if (nearestEnemy.hp <= 0) {
            nearestEnemy.alive = false;
          }

          // Create visual beam (short-lived projectile)
          const beamProj: Projectile = {
            id: `proj-${Date.now()}-${Math.random()}`,
            x: turretX,
            y: turretY,
            targetX: nearestEnemy.x,
            targetY: nearestEnemy.y,
            damage: turret.stats.damage,
            turretId: turret.instanceId,
            speed: 0,
            weaponId: turret.id,
            visualType: 'hitscan',
            color: weaponConfig.color,
            startTime: Date.now(),
          };

          updatedProjectiles.push(beamProj);

          events.push({
            type: 'Hit',
            message: `${turret.name} hit for ${turret.stats.damage} damage`,
            data: { damage: turret.stats.damage, turretId: turret.instanceId, enemyId: nearestEnemy.id },
          });

          // Update enemies
          setEnemies([...enemies]);
        } else {
          // Create projectile for projectile-based weapons
          const newProj: Projectile = {
            id: `proj-${Date.now()}-${Math.random()}`,
            x: turretX,
            y: turretY,
            targetX: nearestEnemy.x,
            targetY: nearestEnemy.y,
            damage: turret.stats.damage,
            turretId: turret.instanceId,
            speed: weaponConfig.speed,
            weaponId: turret.id,
            visualType: weaponConfig.visualType,
            color: weaponConfig.color,
            aoeRadius: weaponConfig.aoeRadius,
            piercing: weaponConfig.piercing,
          };

          updatedProjectiles.push(newProj);
        }

        events.push({
          type: 'ShotFired',
          message: `${turret.name} fired!`,
          data: { turretId: turret.instanceId, ammoSpent: turret.stats.ammoPerShot },
        });
      }
    }
  }

  return {
    resources: newResources,
    projectiles: updatedProjectiles,
    events,
  };
}
