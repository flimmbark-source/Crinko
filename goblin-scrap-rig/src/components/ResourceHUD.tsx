import React from 'react';
import type { GameResources, ResourceCaps } from '../types';
import './ResourceHUD.css';

interface ResourceHUDProps {
  resources: GameResources;
  caps: ResourceCaps;
  phaseTimer: number;
  currentWave: number;
  showStartRound?: boolean;
  showEndRound?: boolean;
  onStartRound?: () => void;
  onEndRound?: () => void;
}

export const ResourceHUD: React.FC<ResourceHUDProps> = ({
  resources,
  caps,
  phaseTimer,
  currentWave,
  showStartRound,
  showEndRound,
  onStartRound,
  onEndRound,
}) => {
  const heatPercent = (resources.heat / caps.heat) * 100;
  const isHotHeat = heatPercent >= 80;
  const isDangerHeat = heatPercent >= 90;

  const getHeatColor = () => {
    if (isDangerHeat) return 'var(--danger-red)';
    if (isHotHeat) return 'var(--hazard-yellow)';
    return 'var(--heat-orange)';
  };

  return (
    <div className="resource-hud">
      <div className="hud-left">
        <div className="wave-counter brass-accent">
          <span className="label">WAVE</span>
          <span className="value">{currentWave}/9</span>
        </div>
      </div>

      <div className="hud-center">
        {/* Scrap */}
        <div className="resource-bar">
          <div className="resource-label">SCRAP</div>
          <div className="bar-container">
            <div
              className="bar-fill"
              style={{
                width: `${(resources.scrap / caps.scrap) * 100}%`,
                background: 'linear-gradient(90deg, #666, #999)',
              }}
            />
            <div className="bar-text">
              {Math.floor(resources.scrap)} / {caps.scrap}
            </div>
          </div>
        </div>

        {/* Ammo */}
        <div className="resource-bar">
          <div className="resource-label">AMMO</div>
          <div className="bar-container">
            <div
              className="bar-fill"
              style={{
                width: `${(resources.ammo / caps.ammo) * 100}%`,
                background: 'linear-gradient(90deg, var(--brass-dark), var(--brass))',
              }}
            />
            <div className="bar-text">
              {Math.floor(resources.ammo)} / {caps.ammo}
            </div>
          </div>
        </div>

        {/* Heat */}
        <div className="resource-bar">
          <div className="resource-label" style={{ color: getHeatColor() }}>
            HEAT {isDangerHeat && '⚠'}
          </div>
          <div className={`bar-container ${isHotHeat ? 'shake' : ''}`}>
            <div
              className="bar-fill"
              style={{
                width: `${heatPercent}%`,
                background: `linear-gradient(90deg, ${getHeatColor()}, ${getHeatColor()}dd)`,
              }}
            />
            <div className="bar-text" style={{ color: getHeatColor() }}>
              {Math.floor(resources.heat)} / {caps.heat}
            </div>
          </div>
        </div>

        {/* Base HP */}
        <div className="resource-bar">
          <div className="resource-label">BASE HP</div>
          <div className="bar-container">
            <div
              className="bar-fill"
              style={{
                width: `${(resources.baseHP / caps.baseHP) * 100}%`,
                background: 'linear-gradient(90deg, var(--danger-red), #ff5555)',
              }}
            />
            <div className="bar-text">
              {Math.floor(resources.baseHP)} / {caps.baseHP}
            </div>
          </div>
        </div>
      </div>

      <div className="hud-right">
        <div className="timer brass-accent">
          <span className="label">TIME</span>
          <span className="value">{phaseTimer}s</span>
        </div>
        <div className="phase-actions">
          {showStartRound && (
            <button className="phase-action-btn" onClick={onStartRound}>
              ▶ Start Round
            </button>
          )}
          {showEndRound && (
            <button className="phase-action-btn" onClick={onEndRound}>
              ⏹ End Round
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
