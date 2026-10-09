import { CELL_COUNT, SIZE, type Board, type GameResult, type Line, type Player } from './types';

/** All 8 ways to win: 3 rows, 3 columns, 2 diagonals. */
export const LINES: readonly Line[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** @returns an empty board */
export function createBoard(): Board {
  return Array<null>(CELL_COUNT).fill(null);
}

/** @returns the opponent of `player` */
export function opponent(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

/**
 * Whose turn it is. X always starts, so it is X's turn whenever both players
 * have made the same number of moves.
 */
export function currentPlayer(board: Board): Player {
  let x = 0;
  let o = 0;
  for (const cell of board) {
    if (cell === 'X') x++;
    else if (cell === 'O') o++;
  }
  return x === o ? 'X' : 'O';
}

/** @returns the indexes of all empty cells, in board order */
export function emptyCells(board: Board): number[] {
  const result: number[] = [];
  board.forEach((cell, index) => {
    if (cell === null) result.push(index);
  });
  return result;
}

/** Checks every line for a winner, then checks for a full board. */
export function getResult(board: Board): GameResult {
  for (const line of LINES) {
    const [a, b, c] = line;
    const first = board[a];
    if (first !== null && first === board[b] && first === board[c]) {
      return { over: true, winner: first, line, draw: false };
    }
  }
  const full = board.every((cell) => cell !== null);
  return { over: full, winner: null, line: null, draw: full };
}

/** A move is legal if it is on the board, the cell is empty and the game is not over. */
export function isValidMove(board: Board, index: number): boolean {
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < CELL_COUNT &&
    board[index] === null &&
    !getResult(board).over
  );
}

/**
 * Plays the current player's mark at `index`.
 *
 * @returns a new board (the input is never changed)
 * @throws Error if the move is illegal
 */
export function applyMove(board: Board, index: number): Board {
  if (!isValidMove(board, index)) {
    throw new Error(`Illegal move: ${index}`);
  }
  const next = board.slice();
  next[index] = currentPlayer(board);
  return next;
}

/** Converts a cell index to its zero-based row and column. */
export function rowCol(index: number): { row: number; col: number } {
  return { row: Math.floor(index / SIZE), col: index % SIZE };
}
