import React, { useRef, useEffect } from 'react';
import type { Enemy, Projectile, ModuleInstance } from '../types';
import { ENEMY_TYPES, WAVE_CONFIGS } from '../data/enemies';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../constants/arena';

interface ArenaProps {
  currentWave: number;
  onBaseHit: (damage: number) => void;
  onEnemyKilled: (enemyId: string) => void;
  onWaveCleared: () => void;
  projectiles: Projectile[];
  turrets: ModuleInstance[];
  isActive: boolean;
}

export const Arena: React.FC<ArenaProps> = ({
  currentWave,
  onBaseHit,
  onEnemyKilled,
  onWaveCleared,
  projectiles,
  turrets,
  isActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const killedEnemiesRef = useRef<Set<string>>(new Set());
  const requestIdRef = useRef<number>(0);
  const spawnedCountRef = useRef(0);
  const totalEnemiesRef = useRef(0);
  const spawnCompleteRef = useRef(false);
  const clearedRef = useRef(false);

  const BASE_X = ARENA_WIDTH / 2;
  const BASE_Y = ARENA_HEIGHT - 30;

  const updateEnemies = (next: Enemy[] | ((prev: Enemy[]) => Enemy[])) => {
    const updated = typeof next === 'function' ? next(enemiesRef.current) : next;
    enemiesRef.current = updated;
    (window as any).__arenaEnemies = updated;
  };

  // Spawn enemies based on wave config
  useEffect(() => {
    if (!isActive) {
      updateEnemies([]);
      killedEnemiesRef.current.clear();
      spawnedCountRef.current = 0;
      totalEnemiesRef.current = 0;
      spawnCompleteRef.current = false;
      clearedRef.current = false;
      return;
    }

    killedEnemiesRef.current.clear();
    spawnedCountRef.current = 0;
    spawnCompleteRef.current = false;
    clearedRef.current = false;

    const waveConfig = WAVE_CONFIGS.find((w) => w.wave === currentWave);
    if (!waveConfig) return;

    const spawnTimers: number[] = [];
    totalEnemiesRef.current = waveConfig.enemies.reduce((sum, group) => sum + group.count, 0);

    waveConfig.enemies.forEach((enemyGroup) => {
      const enemyDef = ENEMY_TYPES[enemyGroup.type];
      if (!enemyDef) return;

      let spawned = 0;
      const interval = setInterval(() => {
        if (spawned >= enemyGroup.count) {
          clearInterval(interval);
          return;
        }

        // Spawn enemy at random X position at top
        const spawnX = Math.random() * (ARENA_WIDTH - 100) + 50;
        const newEnemy: Enemy = {
          id: `enemy-${Date.now()}-${Math.random()}`,
          type: enemyGroup.type,
          x: spawnX,
          y: -30,
          hp: enemyDef.hp,
          maxHP: enemyDef.hp,
          speed: enemyDef.speed,
          damage: enemyDef.damage,
          alive: true,
        };

        updateEnemies((prev) => [...prev, newEnemy]);
        spawned++;
        spawnedCountRef.current += 1;
        if (spawnedCountRef.current >= totalEnemiesRef.current) {
          spawnCompleteRef.current = true;
        }
      }, enemyGroup.spawnInterval * 1000);

      spawnTimers.push(interval);
    });

    return () => {
      spawnTimers.forEach((timer) => clearInterval(timer));
    };
  }, [currentWave, isActive]);

  // Game loop
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Update enemies
      const updated = enemiesRef.current.map((enemy) => {
        if (!enemy.alive) return enemy;

        // Move toward base
        const dx = BASE_X - enemy.x;
        const dy = BASE_Y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20) {
          // Reached base
          onBaseHit(enemy.damage);
          return { ...enemy, alive: false };
        }

        const moveX = (dx / distance) * enemy.speed * deltaTime;
        const moveY = (dy / distance) * enemy.speed * deltaTime;

        return {
          ...enemy,
          x: enemy.x + moveX,
          y: enemy.y + moveY,
        };
      });

      updated.forEach((enemy) => {
        if (!enemy.alive && enemy.hp <= 0 && !killedEnemiesRef.current.has(enemy.id)) {
          killedEnemiesRef.current.add(enemy.id);
          onEnemyKilled(enemy.id);
        }
      });

      const alive = updated.filter((e) => e.alive);
      updateEnemies(alive);
      if (spawnCompleteRef.current && alive.length === 0 && !clearedRef.current) {
        clearedRef.current = true;
        onWaveCleared();
      }

      // Render
      render(ctx);

      requestIdRef.current = requestAnimationFrame(gameLoop);
    };

    requestIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }
    };
  }, [isActive, onBaseHit, onEnemyKilled, onWaveCleared]);

  const render = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Draw base
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(BASE_X, BASE_Y, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BASE', BASE_X, BASE_Y + 4);

    // Draw turrets
    turrets.forEach((turret) => {
      if (turret.kind !== 'spender' || turret.gridX === undefined || turret.gridY === undefined) return;

      // Map grid position to arena position (distribute around the base)
      const gridIndex = turret.gridY * 5 + turret.gridX;
      const angle = (gridIndex / 25) * Math.PI * 2;
      const radius = 100;
      const turretX = BASE_X + Math.cos(angle) * radius;
      const turretY = BASE_Y + Math.sin(angle) * radius;

      // Draw turret body
      ctx.fillStyle = turret.jammed ? '#e63946' : '#9a7f2a';
      ctx.beginPath();
      ctx.arc(turretX, turretY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Draw turret icon
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(turret.art.icon, turretX, turretY);

      // Store turret position for combat system
      (turret as any).__arenaX = turretX;
      (turret as any).__arenaY = turretY;
    });

    // Draw enemies
    enemiesRef.current.forEach((enemy) => {
      const enemyDef = ENEMY_TYPES[enemy.type];
      if (!enemyDef) return;

      // Enemy body
      ctx.fillStyle = enemyDef.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemyDef.size, 0, Math.PI * 2);
      ctx.fill();

      // HP bar
      const hpPercent = enemy.hp / enemy.maxHP;
      ctx.fillStyle = '#333';
      ctx.fillRect(enemy.x - 15, enemy.y - enemyDef.size - 8, 30, 4);
      ctx.fillStyle = hpPercent > 0.5 ? '#4ade80' : hpPercent > 0.25 ? '#fbbf24' : '#ef4444';
      ctx.fillRect(enemy.x - 15, enemy.y - enemyDef.size - 8, 30 * hpPercent, 4);
    });

    // Draw projectiles with different visuals based on type
    projectiles.forEach((proj) => {
      const color = proj.color || '#f4cf57';

      if (proj.visualType === 'hitscan') {
        // Hitscan beam - bright line from turret to target
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.moveTo(proj.x, proj.y);
        ctx.lineTo(proj.targetX, proj.targetY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Impact flash
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(proj.targetX, proj.targetY, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (proj.visualType === 'explosive') {
        // Explosive projectile - larger with glow
        ctx.fillStyle = color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Thick trail
        ctx.strokeStyle = `${color}88`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(proj.x, proj.y);
        const dx = proj.targetX - proj.x;
        const dy = proj.targetY - proj.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const trailX = proj.x - (dx / len) * 15;
          const trailY = proj.y - (dy / len) * 15;
          ctx.lineTo(trailX, trailY);
          ctx.stroke();
        }

        // Draw AoE indicator at target
        if (proj.aoeRadius) {
          ctx.strokeStyle = `${color}44`;
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(proj.targetX, proj.targetY, proj.aoeRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (proj.visualType === 'arc') {
        // Arc projectile - glowing with particle trail
        ctx.fillStyle = color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Multi-segment trail for arc effect
        ctx.strokeStyle = `${color}aa`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(proj.x, proj.y);
        const dx = proj.targetX - proj.x;
        const dy = proj.targetY - proj.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          for (let i = 1; i <= 3; i++) {
            const trailX = proj.x - (dx / len) * (i * 8);
            const trailY = proj.y - (dy / len) * (i * 8);
            const alpha = Math.max(0.2, 1 - i * 0.3);
            ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.arc(trailX, trailY, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Standard projectile
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Trail
        ctx.strokeStyle = `${color}55`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(proj.x, proj.y);
        const dx = proj.targetX - proj.x;
        const dy = proj.targetY - proj.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const trailX = proj.x - (dx / len) * 10;
          const trailY = proj.y - (dy / len) * 10;
          ctx.lineTo(trailX, trailY);
          ctx.stroke();
        }
      }
    });
  };

  // Expose enemies for hit detection
  useEffect(() => {
    (window as any).__arenaEnemies = enemiesRef.current;
    (window as any).__setArenaEnemies = (next: Enemy[] | ((prev: Enemy[]) => Enemy[])) => {
      updateEnemies(next);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={ARENA_WIDTH}
      height={ARENA_HEIGHT}
      style={{ border: '2px solid var(--brass-dark)', background: '#0a0c10' }}
    />
  );
};
