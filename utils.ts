import { GRID_SIZE, getPlaneCoords } from "./constants";
import { CellData, CellStatus, Coordinate, Direction, Plane, PlanePart } from "./types";

export const createEmptyGrid = (): CellData[][] => {
  const grid: CellData[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: CellData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({
        x,
        y,
        status: CellStatus.EMPTY,
      });
    }
    grid.push(row);
  }
  return grid;
};

export const coordToLabel = (x: number, y: number): string => {
  const col = String.fromCharCode(65 + x); // A, B, C...
  const row = y + 1; // 1, 2, 3...
  return `${col}${row}`;
};

// Check if a specific plane configuration is valid against bounds and other planes
export const checkPlaneValidity = (
  plane: Plane,
  allPlanes: Plane[]
): boolean => {
  // 1. Check Bounds
  for (const cell of plane.cells) {
    if (cell.x < 0 || cell.x >= GRID_SIZE || cell.y < 0 || cell.y >= GRID_SIZE) {
      return false;
    }
  }

  // 2. Check Overlaps
  // We need to check if any cell of 'plane' overlaps with any cell of 'other planes'
  for (const other of allPlanes) {
    if (other.id === plane.id) continue; // Skip self

    for (const myCell of plane.cells) {
      for (const otherCell of other.cells) {
        if (myCell.x === otherCell.x && myCell.y === otherCell.y) {
          return false;
        }
      }
    }
  }

  return true;
};

// Kept for backward compatibility or simple checks, but updated to use grid for static checks
export const isValidPlacement = (
  grid: CellData[][],
  head: Coordinate,
  direction: Direction
): boolean => {
  const shape = getPlaneCoords(head, direction);

  for (const pt of shape) {
    // Check bounds
    if (pt.x < 0 || pt.x >= GRID_SIZE || pt.y < 0 || pt.y >= GRID_SIZE) {
      return false;
    }
    // Check overlap
    if (grid[pt.y][pt.x].status === CellStatus.PLANE) {
      return false;
    }
  }
  return true;
};

export const placePlaneOnGrid = (
  grid: CellData[][],
  planeId: string,
  head: Coordinate,
  direction: Direction
): { grid: CellData[][]; plane: Plane } => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  const shape = getPlaneCoords(head, direction);
  const planeCoords: Coordinate[] = [];

  for (const pt of shape) {
    // Only mark on grid if in bounds (though logic should prevent calling this if OOB)
    if (pt.x >= 0 && pt.x < GRID_SIZE && pt.y >= 0 && pt.y < GRID_SIZE) {
        newGrid[pt.y][pt.x].status = CellStatus.PLANE;
        newGrid[pt.y][pt.x].planeId = planeId;
        newGrid[pt.y][pt.x].part = pt.part;
    }
    planeCoords.push({ x: pt.x, y: pt.y, part: pt.part }); // Preserve part info
  }

  const plane: Plane = {
    id: planeId,
    head,
    direction,
    isDestroyed: false,
    cells: planeCoords,
  };

  return { grid: newGrid, plane };
};