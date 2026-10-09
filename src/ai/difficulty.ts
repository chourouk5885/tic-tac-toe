import { emptyCells } from '../game/board';
import type { Board } from '../game/types';
import { chooseBestMove } from './minimax';

/** How strong the computer plays. */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Labels shown in the UI. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Unbeatable',
};

/** Chance that Medium plays the perfect move instead of a random one. */
export const MEDIUM_ACCURACY = 0.6;

/**
 * @returns a uniformly random legal move
 * @throws Error if there are no moves left
 */
export function randomMove(board: Board, random: () => number = Math.random): number {
  const options = emptyCells(board);
  if (options.length === 0) {
    throw new Error('No moves left');
  }
  return options[Math.floor(random() * options.length)];
}

/**
 * Chooses the computer's move.
 *
 * - Easy: any random legal move
 * - Medium: the perfect move 60% of the time, otherwise random
 * - Unbeatable: always a perfect (minimax) move
 */
export function pickMove(board: Board, difficulty: Difficulty, random: () => number = Math.random): number {
  switch (difficulty) {
    case 'easy':
      return randomMove(board, random);
    case 'medium':
      return random() < MEDIUM_ACCURACY ? chooseBestMove(board, random) : randomMove(board, random);
    case 'hard':
      return chooseBestMove(board, random);
  }
}
