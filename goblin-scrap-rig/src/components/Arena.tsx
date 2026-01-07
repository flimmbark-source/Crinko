import React, { useRef, useEffect, useState } from 'react';
import type { Enemy, Projectile } from '../types';
import { ENEMY_TYPES, WAVE_CONFIGS } from '../data/enemies';

interface ArenaProps {
  currentWave: number;
  onBaseHit: (damage: number) => void;
  onEnemyKilled: (enemyId: string) => void;
  projectiles: Projectile[];
  isActive: boolean;
}

export const Arena: React.FC<ArenaProps> = ({
  currentWave,
  onBaseHit,
  onEnemyKilled,
  projectiles,
  isActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const requestIdRef = useRef<number>(0);

  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 450;
  const BASE_X = CANVAS_WIDTH / 2;
  const BASE_Y = CANVAS_HEIGHT - 30;

  // Spawn enemies based on wave config
  useEffect(() => {
    if (!isActive) {
      setEnemies([]);
      return;
    }

    const waveConfig = WAVE_CONFIGS.find((w) => w.wave === currentWave);
    if (!waveConfig) return;

    const spawnTimers: number[] = [];

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
        const spawnX = Math.random() * (CANVAS_WIDTH - 100) + 50;
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

        setEnemies((prev) => [...prev, newEnemy]);
        spawned++;
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
      setEnemies((prevEnemies) => {
        const updated = prevEnemies.map((enemy) => {
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

        // Filter out dead enemies
        const alive = updated.filter((e) => e.alive);

        // Check if any died
        updated.forEach((e) => {
          if (!e.alive && prevEnemies.find((p) => p.id === e.id)?.alive) {
            if (e.hp <= 0) {
              onEnemyKilled(e.id);
            }
          }
        });

        return alive;
      });

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
  }, [isActive, onBaseHit, onEnemyKilled]);

  const render = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw base
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(BASE_X, BASE_Y, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BASE', BASE_X, BASE_Y + 4);

    // Draw enemies
    enemies.forEach((enemy) => {
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

    // Draw projectiles
    projectiles.forEach((proj) => {
      ctx.fillStyle = '#f4cf57';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Trail
      ctx.strokeStyle = 'rgba(244, 207, 87, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(proj.x, proj.y);
      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const trailX = proj.x - (dx / len) * 10;
      const trailY = proj.y - (dy / len) * 10;
      ctx.lineTo(trailX, trailY);
      ctx.stroke();
    });
  };

  // Expose enemies for hit detection
  useEffect(() => {
    (window as any).__arenaEnemies = enemies;
    (window as any).__setArenaEnemies = setEnemies;
  }, [enemies]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{ border: '2px solid var(--brass-dark)', background: '#0a0c10' }}
    />
  );
};
