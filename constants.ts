import { Coordinate, Direction, PlanePart } from "./types";

export const GRID_SIZE = 10;
export const PLANES_PER_PLAYER = 3;

// Relative coordinates for the plane shape based on direction UP
// Center is the HEAD at (0,0)
/*
   H
 WWWWW
   B
  TTT
*/
const BASE_SHAPE: { x: number; y: number; part: PlanePart }[] = [
  { x: 0, y: 0, part: PlanePart.HEAD },
  { x: -2, y: 1, part: PlanePart.WING },
  { x: -1, y: 1, part: PlanePart.WING },
  { x: 0, y: 1, part: PlanePart.WING }, // Center wing
  { x: 1, y: 1, part: PlanePart.WING },
  { x: 2, y: 1, part: PlanePart.WING },
  { x: 0, y: 2, part: PlanePart.BODY },
  { x: -1, y: 3, part: PlanePart.TAIL },
  { x: 0, y: 3, part: PlanePart.TAIL },
  { x: 1, y: 3, part: PlanePart.TAIL },
];

export const getPlaneCoords = (head: Coordinate, dir: Direction) => {
  return BASE_SHAPE.map((pt) => {
    let dx = pt.x;
    let dy = pt.y;

    // Rotate the point
    let rx = dx;
    let ry = dy;

    switch (dir) {
      case Direction.RIGHT:
        rx = -dy;
        ry = dx;
        break;
      case Direction.DOWN:
        rx = -dx;
        ry = -dy;
        break;
      case Direction.LEFT:
        rx = dy;
        ry = -dx;
        break;
      case Direction.UP:
      default:
        // No change
        break;
    }

    return {
      x: head.x + rx,
      y: head.y + ry,
      part: pt.part,
    };
  });
};