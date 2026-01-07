import React from 'react';
import type { ModuleInstance } from '../types';
import './ModuleInventory.css';

interface ModuleInventoryProps {
  modules: ModuleInstance[];
  onSalvage: (moduleId: string) => void;
}

export const ModuleInventory: React.FC<ModuleInventoryProps> = ({
  modules,
  onSalvage,
}) => {
  const handleDragStart = (e: React.DragEvent, module: ModuleInstance) => {
    e.dataTransfer.setData('module', JSON.stringify(module));
  };
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

  const getKindLabel = (kind: string) => {
    return kind.toUpperCase();
  };

  return (
    <div className="module-inventory">
      {modules.length === 0 && (
        <div className="empty-inventory">
          <p>No modules in inventory</p>
          <p style={{ fontSize: '12px', opacity: 0.6 }}>
            Place modules on the grid or earn more from rewards
          </p>
        </div>
      )}

      {modules.map((module) => (
        <div
          key={module.instanceId}
          className="inventory-module"
          draggable
          onDragStart={(e) => handleDragStart(e, module)}
          style={{
            borderColor: getRarityColor(module.rarity),
          }}
        >
          <div className="module-header">
            <div className="module-icon-large">{module.art.icon}</div>
            <div className="module-info">
              <div className="module-name-inv">{module.name}</div>
              <div className="module-kind" style={{ color: getRarityColor(module.rarity) }}>
                {getKindLabel(module.kind)}
              </div>
            </div>
          </div>

          <div className="module-stats">
            {module.stats.scrapPerSec && (
              <div className="stat">
                ⛏️ +{module.stats.scrapPerSec}/s scrap
              </div>
            )}
            {module.stats.scrapToAmmoRate && (
              <div className="stat">
                ⚙️ {module.stats.scrapToAmmoRate}:1 scrap→ammo
              </div>
            )}
            {module.stats.coolingPerSec && (
              <div className="stat">
                ❄️ -{module.stats.coolingPerSec}/s heat
              </div>
            )}
            {module.stats.damage && (
              <div className="stat">
                ⚔️ {module.stats.damage} dmg @ {module.stats.fireRate}/s
              </div>
            )}
            {module.stats.heatPerAction !== undefined && module.stats.heatPerAction > 0 && (
              <div className="stat heat-cost">
                🔥 +{module.stats.heatPerAction} heat
              </div>
            )}
          </div>

          {module.affixes.length > 0 && (
            <div className="module-affixes">
              {module.affixes.map((affix, idx) => (
                <div key={idx} className="affix-tag">
                  {affix.affixId}
                </div>
              ))}
            </div>
          )}

          <button
            className="salvage-btn"
            onClick={() => onSalvage(module.instanceId)}
            title="Salvage for scrap"
          >
            🔨 Salvage
          </button>
        </div>
      ))}
    </div>
  );
};
