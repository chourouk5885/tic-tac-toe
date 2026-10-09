/**
 * The unbeatable Tic-Tac-Toe AI.
 *
 * ## How minimax works
 * Tic-Tac-Toe is small enough to look at *every* possible continuation of a game.
 * Minimax imagines both players playing perfectly:
 *
 *   - On the AI's turn it picks the move with the **highest** score (it is the "max" player).
 *   - On the opponent's turn it assumes they pick the move with the **lowest** score
 *     for the AI (the "min" player).
 *
 * Finished games are scored from the AI's point of view:
 *
 *   - AI wins  → `+10 − depth`
 *   - AI loses → `depth − 10`
 *   - draw     → `0`
 *
 * `depth` is how many moves it took to get there. Subtracting it makes a quick win
 * worth more than a slow one, and a slow loss less bad than a quick one, so the AI
 * finishes games fast when winning and fights as long as possible when it can't.
 *
 * The scores bubble up the game tree: each position is worth the best score its
 * player can force. Because Tic-Tac-Toe is a draw with perfect play, the AI can
 * always get at least `0` — it never loses.
 *
 * ## Alpha-beta pruning
 * While searching, `alpha` is the best score the maximiser is already guaranteed and
 * `beta` the best the minimiser is guaranteed. As soon as `beta <= alpha`, the
 * opponent would never allow this line of play, so the remaining moves in it are
 * skipped. The answer is identical to plain minimax; it just checks far fewer positions.
 */
import { applyMove, currentPlayer, emptyCells, getResult } from '../game/board';
import type { Board, Player } from '../game/types';

/** Score of a win found immediately; deeper wins score slightly less. */
export const WIN_SCORE = 10;

/** A legal move and its minimax score for the player about to move. */
export interface ScoredMove {
  readonly index: number;
  readonly score: number;
}

/** What a move leads to with perfect play from both sides. */
export type Outcome = 'win' | 'draw' | 'loss';

/**
 * Scores every legal move for the player whose turn it is.
 * Each move gets an exact score (full alpha-beta window per move), which the
 * "Show AI thinking" overlay displays.
 */
export function scoreMoves(board: Board): ScoredMove[] {
  const me = currentPlayer(board);
  return emptyCells(board).map((index) => ({
    index,
    score: minimax(applyMove(board, index), 1, -Infinity, Infinity, false, me),
  }));
}

/** @returns every move that shares the best score (ties are equally perfect) */
export function bestMoves(board: Board): number[] {
  const scored = scoreMoves(board);
  if (scored.length === 0) return [];
  const top = Math.max(...scored.map((m) => m.score));
  return scored.filter((m) => m.score === top).map((m) => m.index);
}

/**
 * Picks a perfect move, choosing randomly among equally good ones so games vary.
 *
 * @param random source of randomness in [0, 1) — injectable for tests
 * @throws Error if the game is already over
 */
export function chooseBestMove(board: Board, random: () => number = Math.random): number {
  const options = bestMoves(board);
  if (options.length === 0) {
    throw new Error('No moves left');
  }
  return options[Math.floor(random() * options.length)];
}

/** Converts a score into a plain-language outcome. */
export function outcomeOf(score: number): Outcome {
  if (score > 0) return 'win';
  if (score < 0) return 'loss';
  return 'draw';
}

/**
 * Minimax with alpha-beta pruning.
 *
 * @param board      position to evaluate
 * @param depth      moves played since the root
 * @param alpha      best score the maximiser can already guarantee
 * @param beta       best score the minimiser can already guarantee
 * @param maximizing `true` when it is `me` to move
 * @param me         the player we are scoring for
 */
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  me: Player,
): number {
  const result = getResult(board);
  if (result.winner === me) return WIN_SCORE - depth;
  if (result.winner !== null) return depth - WIN_SCORE;
  if (result.draw) return 0;

  if (maximizing) {
    let best = -Infinity;
    for (const index of emptyCells(board)) {
      best = Math.max(best, minimax(applyMove(board, index), depth + 1, alpha, beta, false, me));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break; // the opponent will never let us get here
    }
    return best;
  }

  let best = Infinity;
  for (const index of emptyCells(board)) {
    best = Math.min(best, minimax(applyMove(board, index), depth + 1, alpha, beta, true, me));
    beta = Math.min(beta, best);
    if (beta <= alpha) break; // we already have something better elsewhere
  }
  return best;
}
