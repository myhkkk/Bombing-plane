export enum CellStatus {
  EMPTY = 'EMPTY',
  PLANE = 'PLANE', // Part of a plane, hidden to enemy
  MISS = 'MISS',   // Shot and missed
  HIT = 'HIT',     // Shot and hit wing/body/tail
  DEAD = 'DEAD',   // Shot the head (Kill)
}

export enum PlanePart {
  HEAD = 'HEAD',
  WING = 'WING',
  BODY = 'BODY',
  TAIL = 'TAIL',
}

export enum Direction {
  UP = 'UP',
  RIGHT = 'RIGHT',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
}

export interface Coordinate {
  x: number;
  y: number;
  part?: PlanePart;
}

export interface CellData {
  x: number;
  y: number;
  status: CellStatus;
  planeId?: string;
  part?: PlanePart;
}

export interface Plane {
  id: string;
  head: Coordinate;
  direction: Direction;
  isDestroyed: boolean;
  cells: Coordinate[]; // All coordinates occupied by this plane
}

export interface PlayerState {
  id: 1 | 2;
  name: string;
  grid: CellData[][];
  planes: Plane[];
  ghostPlanes: Plane[]; // Planes placed by player on enemy board for deduction
  alivePlanesCount: number;
  isReady: boolean;
  hasShotThisTurn: boolean; // Tracks if they fired a shot
}

export enum GamePhase {
  SETUP = 'SETUP',
  TRANSITION = 'TRANSITION', // Passing device
  BATTLE = 'BATTLE',
  GAME_OVER = 'GAME_OVER',
}

export type TurnLog = {
  player: string;
  coord: string; // e.g., "B5"
  result: 'MISS' | 'HIT' | 'KILL';
  turnNumber: number;
};