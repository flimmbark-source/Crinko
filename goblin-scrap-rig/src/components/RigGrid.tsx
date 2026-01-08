import React, { useState } from 'react';
import type { ModuleInstance } from '../types';
import { ModuleTooltip } from './ModuleTooltip';
import { formatRange } from '../utils/range';
import './RigGrid.css';

interface RigGridProps {
  modules: ModuleInstance[];
  onModulePlaced: (module: ModuleInstance, x: number, y: number) => void;
  onModuleRemoved: (moduleId: string) => void;
  onModuleMoved: (moduleId: string, x: number, y: number) => void;
}

export const RigGrid: React.FC<RigGridProps> = ({
  modules,
  onModulePlaced,
  onModuleRemoved,
  onModuleMoved,
}) => {
  const GRID_SIZE = 5;
  const [hoveredModule, setHoveredModule] = useState<{
    module: ModuleInstance;
    x: number;
    y: number;
  } | null>(null);

  const getModuleAtPosition = (x: number, y: number): ModuleInstance | undefined => {
    return modules.find((m) => m.gridX === x && m.gridY === y);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent, module: ModuleInstance) => {
    e.dataTransfer.setData('module', JSON.stringify(module));
  };

  const handleDrop = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    const moduleData = e.dataTransfer.getData('module');
    if (!moduleData) return;

    const draggedModule: ModuleInstance = JSON.parse(moduleData);

    const existingModule = getModuleAtPosition(x, y);
    if (existingModule) {
      // Can't place on occupied slot
      return;
    }

    if (draggedModule.gridX !== undefined && draggedModule.gridY !== undefined) {
      // Moving existing module
      onModuleMoved(draggedModule.instanceId, x, y);
    } else {
      // Placing new module from inventory
      onModulePlaced(draggedModule, x, y);
    }
  };

  const handleCellClick = (x: number, y: number) => {
    const module = getModuleAtPosition(x, y);
    if (module) {
      onModuleRemoved(module.instanceId);
    }
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
    <>
      <div className="rig-grid">
        {Array.from({ length: GRID_SIZE }).map((_, y) => (
          <div key={y} className="grid-row">
            {Array.from({ length: GRID_SIZE }).map((_, x) => {
              const module = getModuleAtPosition(x, y);
              const isOccupied = !!module;

              return (
                <div
                  key={`${x}-${y}`}
                  className={`grid-cell ${isOccupied ? 'occupied' : ''} ${
                    module?.jammed ? 'jammed shake' : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, x, y)}
                  onClick={() => handleCellClick(x, y)}
                  title={isOccupied ? `Click to remove ${module.name}` : 'Drop module here'}
                >
                {module ? (
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
                    {module.jammed && <div className="jam-indicator">JAMMED!</div>}
                  </div>
                ) : (
                  <div className="empty-slot">
                    <span className="slot-coords">
                      {x},{y}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      </div>

      {hoveredModule && (
        <ModuleTooltip
          module={hoveredModule.module}
          x={hoveredModule.x}
          y={hoveredModule.y}
        />
      )}
    </>
  );
};
