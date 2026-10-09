import { describe, expect, it } from 'vitest';
import {
  LINES,
  applyMove,
  createBoard,
  currentPlayer,
  emptyCells,
  getResult,
  isValidMove,
} from '../src/game/board';
import type { Cell } from '../src/game/types';
import { board } from './helpers';

describe('board basics', () => {
  it('starts empty with X to move', () => {
    const b = createBoard();
    expect(emptyCells(b)).toHaveLength(9);
    expect(currentPlayer(b)).toBe('X');
    expect(getResult(b)).toEqual({ over: false, winner: null, line: null, draw: false });
  });

  it('alternates turns starting with X', () => {
    let b = createBoard();
    b = applyMove(b, 4);
    expect(b[4]).toBe('X');
    expect(currentPlayer(b)).toBe('O');
    b = applyMove(b, 0);
    expect(b[0]).toBe('O');
    expect(currentPlayer(b)).toBe('X');
  });

  it('never mutates the original board', () => {
    const b = createBoard();
    applyMove(b, 0);
    expect(b[0]).toBeNull();
  });
});

describe('win detection', () => {
  it.each(LINES.map((line) => [line.join(','), line] as const))('detects a win on line %s', (_, line) => {
    const cells: Cell[] = Array<Cell>(9).fill(null);
    for (const i of line) cells[i] = 'O';
    const result = getResult(cells);
    expect(result.over).toBe(true);
    expect(result.winner).toBe('O');
    expect(result.line).toEqual(line);
    expect(result.draw).toBe(false);
  });

  it('reports no winner for an unfinished game', () => {
    const result = getResult(board('XO. .X. ..O'));
    expect(result.over).toBe(false);
    expect(result.winner).toBeNull();
  });

  it('detects a draw on a full board with no line', () => {
    const result = getResult(board('XOX XOO OXX'));
    expect(result).toEqual({ over: true, winner: null, line: null, draw: true });
  });

  it('a win on the last move is a win, not a draw', () => {
    const result = getResult(board('XOX OXO OXX'));
    expect(result.winner).toBe('X');
    expect(result.draw).toBe(false);
  });
});

describe('illegal moves', () => {
  it('rejects an occupied cell', () => {
    const b = applyMove(createBoard(), 0);
    expect(isValidMove(b, 0)).toBe(false);
    expect(() => applyMove(b, 0)).toThrow();
  });

  it('rejects out-of-range and non-integer indexes', () => {
    const b = createBoard();
    for (const bad of [-1, 9, 1.5, Number.NaN]) {
      expect(isValidMove(b, bad)).toBe(false);
      expect(() => applyMove(b, bad)).toThrow();
    }
  });

  it('rejects any move after the game is over', () => {
    const won = board('XXX OO. ...');
    expect(isValidMove(won, 8)).toBe(false);
    expect(() => applyMove(won, 8)).toThrow();
  });
});
