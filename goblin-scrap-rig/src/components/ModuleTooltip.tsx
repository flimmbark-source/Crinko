import React from 'react';
import type { ModuleInstance } from '../types';
import { AFFIX_POOL } from '../data/affixes';
import { formatRange, getRangeBand } from '../utils/range';
import './ModuleTooltip.css';

interface ModuleTooltipProps {
  module: ModuleInstance;
  x: number;
  y: number;
}

export const ModuleTooltip: React.FC<ModuleTooltipProps> = ({ module, x, y }) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'var(--common)';
      case 'uncommon':
        return 'var(--uncommon)';
      case 'rare':
        return 'var(--rare)';
      default:
        return 'var(--common)';
    }
  };

  return (
    <div className="module-tooltip" style={{ left: x, top: y }}>
      <div className="tooltip-header" style={{ borderColor: getRarityColor(module.rarity) }}>
        <span className="tooltip-icon">{module.art.icon}</span>
        <div className="tooltip-title">
          <div className="tooltip-name" style={{ color: getRarityColor(module.rarity) }}>
            {module.name}
          </div>
          <div className="tooltip-kind">{module.kind.toUpperCase()}</div>
        </div>
      </div>

      <div className="tooltip-stats">
        {module.stats.scrapPerSec !== undefined && module.stats.scrapPerSec > 0 && (
          <div className="stat-row">
            <span className="stat-label">Scrap Production:</span>
            <span className="stat-value">+{module.stats.scrapPerSec}/s</span>
          </div>
        )}
        {module.stats.scrapToAmmoRate !== undefined && module.stats.scrapToAmmoRate > 0 && (
          <div className="stat-row">
            <span className="stat-label">Conversion:</span>
            <span className="stat-value">{module.stats.scrapToAmmoRate} scrap → 1 ammo</span>
          </div>
        )}
        {module.stats.coolingPerSec !== undefined && module.stats.coolingPerSec > 0 && (
          <div className="stat-row">
            <span className="stat-label">Cooling:</span>
            <span className="stat-value">-{module.stats.coolingPerSec}/s heat</span>
          </div>
        )}
        {module.stats.damage !== undefined && module.stats.damage > 0 && (
          <>
            <div className="stat-row">
              <span className="stat-label">Damage:</span>
              <span className="stat-value">{module.stats.damage}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Fire Rate:</span>
              <span className="stat-value">{module.stats.fireRate}/s</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Ammo/Shot:</span>
              <span className="stat-value">{module.stats.ammoPerShot}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Range:</span>
              <span className="stat-value">
                {formatRange(module.stats.range)} ({getRangeBand(module.stats.range)})
              </span>
            </div>
          </>
        )}
        {module.stats.heatPerAction !== undefined && module.stats.heatPerAction > 0 && (
          <div className="stat-row heat-stat">
            <span className="stat-label">Heat/Action:</span>
            <span className="stat-value">+{module.stats.heatPerAction}</span>
          </div>
        )}
      </div>

      {module.affixes.length > 0 && (
        <div className="tooltip-affixes">
          <div className="affixes-label">Affixes:</div>
          {module.affixes.map((affix, idx) => {
            const affixDef = AFFIX_POOL.find((a) => a.id === affix.affixId);
            return (
              <div key={idx} className="affix-row">
                <span className="affix-name">{affixDef?.name || affix.affixId}</span>
                <span className="affix-desc">{affixDef?.description || ''}</span>
              </div>
            );
          })}
        </div>
      )}

      {module.jammed && (
        <div className="tooltip-status jammed">
          ⚠️ JAMMED - Module is temporarily disabled
        </div>
      )}
    </div>
  );
};
