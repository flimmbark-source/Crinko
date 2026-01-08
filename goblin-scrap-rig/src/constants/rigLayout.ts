export const GRID_SIZE = 5;
export const CELL_SIZE = 70;
export const CELL_GAP = 8;
export const GRID_PADDING = 12;
export const CELL_PITCH = CELL_SIZE + CELL_GAP;

export const gridToPixel = (coord: number) => GRID_PADDING + coord * CELL_PITCH - CELL_GAP / 2;
