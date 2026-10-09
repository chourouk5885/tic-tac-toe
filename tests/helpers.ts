import type { Board, Cell } from '../src/game/types';

/** Builds a board from a 9-character string: 'X', 'O' or '.' for empty. Spaces are ignored. */
export function board(layout: string): Board {
  const cells = layout.replace(/\s/g, '').split('');
  if (cells.length !== 9) throw new Error(`Bad layout: ${layout}`);
  return cells.map((c): Cell => (c === 'X' || c === 'O' ? c : null));
}
