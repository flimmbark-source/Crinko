import React, { useEffect, useState } from 'react';
import type { ModuleInstance } from '../types';
import { ModuleTooltip } from './ModuleTooltip';
import { formatRange } from '../utils/range';
import './ModuleInventory.css';

interface ModuleInventoryProps {
  modules: ModuleInstance[];
  onSalvage: (moduleId: string) => void;
}

export const ModuleInventory: React.FC<ModuleInventoryProps> = ({
  modules,
  onSalvage,
}) => {
  const [hoveredModule, setHoveredModule] = useState<{
    module: ModuleInstance;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!hoveredModule) return;
    const stillExists = modules.some((module) => module.instanceId === hoveredModule.module.instanceId);
    if (!stillExists) {
      setHoveredModule(null);
    }
  }, [modules, hoveredModule]);

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

      {modules.length > 0 && (
        <div className="inventory-grid">
          {modules.map((module) => (
            <div
              key={module.instanceId}
              className="inventory-module grid-cell occupied"
            >
              <div
                className="module-in-grid"
                draggable
                onDragStart={(e) => handleDragStart(e, module)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredModule({
                    module,
                    x: rect.right + 10,
                    y: rect.top,
                  });
                }}
                onMouseLeave={() => setHoveredModule(null)}
                style={{
                  borderColor: getRarityColor(module.rarity),
                }}
              >
                <div className="module-icon">{module.art.icon}</div>
                <div className="module-name">{module.name}</div>
                {module.stats.range !== undefined && (
                  <div className="module-range">{formatRange(module.stats.range)}</div>
                )}
              </div>
              <button
                className="salvage-btn"
                onClick={() => onSalvage(module.instanceId)}
                title="Salvage for scrap"
              >
                🔨
              </button>
            </div>
          ))}
        </div>
      )}

      {hoveredModule && (
        <ModuleTooltip
          module={hoveredModule.module}
          x={hoveredModule.x}
          y={hoveredModule.y}
        />
      )}
    </div>
  );
};
