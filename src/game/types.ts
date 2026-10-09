/** One of the two players. X always moves first. */
export type Player = 'X' | 'O';

/** A square on the board: empty (`null`) or taken by a player. */
export type Cell = Player | null;

/** The 3×3 board as 9 cells, row by row (index = row * 3 + column). Never mutated. */
export type Board = readonly Cell[];

/** Three cell indexes that form a winning line. */
export type Line = readonly [number, number, number];

/** The state of a finished or unfinished game. */
export interface GameResult {
  /** `true` once someone has won or the board is full. */
  readonly over: boolean;
  /** The winner, or `null` for no winner (yet). */
  readonly winner: Player | null;
  /** The winning line so the UI can highlight it, or `null`. */
  readonly line: Line | null;
  /** `true` when the board is full and nobody won. */
  readonly draw: boolean;
}

/** Number of rows and columns. */
export const SIZE = 3;

/** Number of cells on the board. */
export const CELL_COUNT = SIZE * SIZE;
