import { describe, expect, it } from 'vitest';
import { pickMove, randomMove } from '../src/ai/difficulty';
import { bestMoves, chooseBestMove, outcomeOf, scoreMoves } from '../src/ai/minimax';
import { applyMove, createBoard, currentPlayer, emptyCells, getResult } from '../src/game/board';
import type { Board, Player } from '../src/game/types';
import { board } from './helpers';

describe('minimax basics', () => {
  it('takes an immediate win', () => {
    // X to move; 2 completes the top row.
    const b = board('XX. OO. ...');
    expect(bestMoves(b)).toEqual([2]);
  });

  it('prefers winning now over blocking', () => {
    // O to move: O can win at 5, X threatens 2. Winning beats blocking.
    const b = board('XX. OO. X..');
    expect(currentPlayer(b)).toBe('O');
    expect(bestMoves(b)).toEqual([5]);
  });

  it('blocks an immediate loss', () => {
    // O to move; X threatens the top row at 2.
    const b = board('XX. .O. ...');
    expect(bestMoves(b)).toEqual([2]);
  });

  it('answers a corner opening with the centre (the only reply that does not lose)', () => {
    // After X takes a corner, O must take the centre — every other reply loses.
    const b = board('X.. ... ...');
    expect(bestMoves(b)).toEqual([4]);
  });

  it('scores the empty board as a draw for every move', () => {
    const scores = scoreMoves(createBoard());
    expect(scores).toHaveLength(9);
    for (const s of scores) expect(outcomeOf(s.score)).toBe('draw');
  });

  it('labels winning, drawing and losing moves', () => {
    // X to move: 2 wins; most moves lose because O threatens 3-4-5.
    const outcomes = new Map(scoreMoves(board('XX. OO. ...')).map((s) => [s.index, outcomeOf(s.score)]));
    expect(outcomes.get(2)).toBe('win');
    expect(outcomes.get(8)).toBe('loss');
  });

  it('chooses randomly among equally good moves', () => {
    const b = createBoard();
    const seen = new Set<number>();
    for (let i = 0; i < 9; i++) seen.add(chooseBestMove(b, () => i / 9));
    expect(seen.size).toBe(9);
  });

  it('throws when the game is already over', () => {
    expect(() => chooseBestMove(board('XXX OO. ...'))).toThrow();
  });
});

describe('the Unbeatable AI never loses', () => {
  /**
   * Plays every possible game: the opponent tries every legal move, and the AI tries
   * every one of its equally perfect moves. If the AI lost even once, this would find it.
   */
  function exploreAllGames(b: Board, ai: Player, stats: { games: number; losses: number; aiWins: number }): void {
    const result = getResult(b);
    if (result.over) {
      stats.games++;
      if (result.winner === ai) stats.aiWins++;
      else if (result.winner !== null) stats.losses++;
      return;
    }
    const moves = currentPlayer(b) === ai ? bestMoves(b) : emptyCells(b);
    for (const move of moves) exploreAllGames(applyMove(b, move), ai, stats);
  }

  it.each(['X', 'O'] as const)('never loses when playing as %s', (ai) => {
    const stats = { games: 0, losses: 0, aiWins: 0 };
    exploreAllGames(createBoard(), ai, stats);
    expect(stats.losses).toBe(0);
    expect(stats.games).toBeGreaterThan(100);
    expect(stats.aiWins).toBeGreaterThan(0); // it also punishes mistakes
  });
});

describe('difficulty levels', () => {
  it('Easy plays any legal move', () => {
    const b = board('XO. ... ...');
    expect(randomMove(b, () => 0)).toBe(2);
    expect(randomMove(b, () => 0.999)).toBe(8);
  });

  it('Unbeatable always plays a perfect move', () => {
    const b = board('XX. .O. ...');
    for (let i = 0; i < 10; i++) expect(pickMove(b, 'hard', () => i / 10)).toBe(2);
  });

  it('Medium plays perfectly when the roll succeeds and randomly otherwise', () => {
    const b = board('XX. .O. ...');
    expect(pickMove(b, 'medium', () => 0.1)).toBe(2); // roll < 0.6 → perfect
    const rolls = [0.9, 0]; // fail the roll, then pick the first empty cell
    expect(pickMove(b, 'medium', () => rolls.shift() ?? 0)).toBe(2);
    const rolls2 = [0.9, 0.99];
    expect(pickMove(b, 'medium', () => rolls2.shift() ?? 0)).toBe(8);
  });
});
