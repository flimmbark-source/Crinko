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
    // Move projectile toward target
    const dx = proj.targetX - proj.x;
    const dy = proj.targetY - proj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < proj.speed * deltaTime) {
      // Hit! Find enemy at target location
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

        // Create projectile
        const newProj: Projectile = {
          id: `proj-${Date.now()}-${Math.random()}`,
          x: turretX,
          y: turretY,
          targetX: nearestEnemy.x,
          targetY: nearestEnemy.y,
          damage: turret.stats.damage,
          turretId: turret.instanceId,
          speed: 400, // pixels per second
        };

        updatedProjectiles.push(newProj);

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
