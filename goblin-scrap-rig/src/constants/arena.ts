export const ARENA_WIDTH = 600;
export const ARENA_HEIGHT = 450;
export const RANGE_UNITS_PER_SCREEN = 1000;

export const rangeUnitsToPixels = (rangeUnits: number) =>
  (rangeUnits / RANGE_UNITS_PER_SCREEN) * ARENA_HEIGHT;
