import React from 'react';
import { CellData, CellStatus, Plane, PlanePart } from '../types';
import { GRID_SIZE } from '../constants';
import { Skull, Flame } from 'lucide-react';

interface InteractivePlaneData {
  plane: Plane;
  isValid: boolean;
  isDragging: boolean;
}

interface GridProps {
  grid: CellData[][];
  interactivePlanes?: InteractivePlaneData[]; // For Setup & Deduction

  onPointerDown?: (x: number, y: number, e: React.PointerEvent) => void;
  onPointerMove?: (x: number, y: number, e: React.PointerEvent) => void;
  onPointerUp?: (x: number, y: number, e: React.PointerEvent) => void;
  onPointerLeave?: () => void;

  revealPlanes?: boolean;
  previewCoords?: { x: number; y: number; isValid: boolean }[];
  hiddenPlaneId?: string | null;
  disabled?: boolean;
  selectedPlaneId?: string | null;
  className?: string;
}

const Grid: React.FC<GridProps> = ({
  grid,
  interactivePlanes,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  revealPlanes = false,
  previewCoords = [],
  hiddenPlaneId = null,
  disabled = false,
  selectedPlaneId = null,
  className = "",
}) => {

  // Helper to check if a cell is part of an interactive plane
  const getInteractivePart = (x: number, y: number) => {
    if (!interactivePlanes) return null;
    for (const { plane, isValid, isDragging } of interactivePlanes) {
      if (isDragging) continue;
      const cell = plane.cells.find(c => c.x === x && c.y === y);
      if (cell) {
        return {
          part: cell.part || (cell as any).part,
          isValid,
          id: plane.id,
          isSelected: plane.id === selectedPlaneId
        };
      }
    }
    return null;
  };

  const getCellContent = (
    cell: CellData,
    isPreview: boolean,
    isValidPreview: boolean,
    interactivePart: { part: PlanePart, isValid: boolean, isSelected: boolean } | null
  ) => {

    // 1. Hit/Miss markers (Top priority)
    if (cell.status === CellStatus.DEAD) {
      return <Skull className="w-[80%] h-[80%] text-red-950 fill-red-500 drop-shadow-md animate-pulse z-20 pointer-events-none" />;
    }
    if (cell.status === CellStatus.HIT) {
      return <Flame className="w-[80%] h-[80%] text-orange-500 fill-orange-500/50 animate-bounce z-20 pointer-events-none" />;
    }
    if (cell.status === CellStatus.MISS) {
      return <div className="w-[30%] h-[30%] bg-slate-500 rounded-full opacity-50 z-20 pointer-events-none" />;
    }

    // 2. Interactive Planes (Setup / Deduction) - RENDER BELOW PREVIEW IF SELECTED/DRAGGING
    if (interactivePart) {
      let color = interactivePart.isValid ? "bg-slate-500" : "bg-red-500/50";
      let cursorClass = "";
      let borderClass = interactivePart.isValid ? 'border-slate-700/20' : 'border-red-500/50';

      if (interactivePart.isSelected) {
        color = interactivePart.isValid ? "bg-yellow-500/40" : "bg-red-500/60";
        borderClass = "border-yellow-400 border-2";
      }

      if (interactivePart.part === PlanePart.HEAD) {
        color = interactivePart.isValid ? "bg-emerald-500 ring-2 ring-emerald-500/50 z-10" : "bg-red-600 ring-2 ring-red-600/50 z-10";
        if (interactivePart.isSelected) {
          color = "bg-yellow-500 ring-2 ring-yellow-400 z-10";
        }
        cursorClass = "cursor-grab active:cursor-grabbing";
      } else if (interactivePart.part === PlanePart.BODY) {
        if (!interactivePart.isSelected) color = interactivePart.isValid ? "bg-slate-600" : "bg-red-500/60";
      }

      return <div className={`w-full h-full ${color} border ${borderClass} absolute inset-0 transition-colors ${cursorClass}`} />;
    }

    // 3. Preview
    if (isPreview) {
      return (
        <div className={`w-full h-full rounded-sm opacity-75 z-30 pointer-events-none border ${isValidPreview ? 'bg-emerald-500/60 border-emerald-400' : 'bg-red-500/60 border-red-400'}`} />
      );
    }

    // 4. Revealed Planes
    if (!interactivePlanes && cell.status === CellStatus.PLANE && revealPlanes && cell.planeId !== hiddenPlaneId) {
      let color = "bg-slate-500";
      let cursorClass = "";

      if (cell.part === PlanePart.HEAD) {
        color = "bg-emerald-500 ring-2 ring-emerald-500/50 z-10";
        cursorClass = "cursor-grab active:cursor-grabbing";
      } else if (cell.part === PlanePart.BODY) {
        color = "bg-slate-600";
      }

      return <div className={`w-full h-full ${color} border border-slate-700/20 absolute inset-0 transition-colors ${cursorClass}`} />;
    }

    return null;
  };

  const getCellBackground = (cell: CellData) => {
    if (cell.status === CellStatus.DEAD) return 'bg-red-900/40';
    if (cell.status === CellStatus.HIT) return 'bg-orange-900/40';
    if (cell.status === CellStatus.MISS) return 'bg-slate-800/80';
    return 'bg-slate-900/80';
  };

  return (
    <div className={`flex flex-col select-none touch-none ${className}`}>
      <div className="flex pl-[8%] mb-1">
        {Array.from({ length: GRID_SIZE }).map((_, i) => (
          <div key={i} className="flex-1 text-center text-[10px] sm:text-xs font-mono text-slate-400/80">
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>

      <div className="flex flex-1">
        <div className="flex flex-col w-[8%] pr-1 pt-[2%] gap-px">
          {Array.from({ length: GRID_SIZE }).map((_, i) => (
            <div key={i} className="flex-1 text-right text-[10px] sm:text-xs font-mono text-slate-400/80 flex items-center justify-end">
              {i + 1}
            </div>
          ))}
        </div>

        <div
          className="grid gap-px bg-slate-700/50 border border-slate-700/50 rounded-sm shadow-xl touch-none aspect-square w-full"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          }}
          onPointerLeave={onPointerLeave}
        >
          {grid.map((row) =>
            row.map((cell) => {
              const preview = previewCoords.find((p) => p.x === cell.x && p.y === cell.y);
              const isPreview = !!preview;
              const isValid = preview?.isValid ?? false;
              const interactivePart = getInteractivePart(cell.x, cell.y);

              return (
                <div
                  key={`${cell.x}-${cell.y}`}
                  className={`
                    relative grid-cell flex items-center justify-center overflow-hidden
                    ${getCellBackground(cell)}
                    ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}
                    ${!interactivePlanes && !disabled && cell.status === CellStatus.EMPTY ? 'hover:bg-slate-800' : ''}
                  `}
                  onPointerDown={(e) => !disabled && onPointerDown && onPointerDown(cell.x, cell.y, e)}
                  onPointerMove={(e) => !disabled && onPointerMove && onPointerMove(cell.x, cell.y, e)}
                  onPointerUp={(e) => !disabled && onPointerUp && onPointerUp(cell.x, cell.y, e)}
                  data-grid-x={cell.x}
                  data-grid-y={cell.y}
                >
                  {getCellContent(cell, isPreview, isValid, interactivePart)}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Grid;