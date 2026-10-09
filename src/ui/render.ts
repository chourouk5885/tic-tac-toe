import type { Outcome } from '../ai/minimax';
import { rowCol } from '../game/board';
import { CELL_COUNT, SIZE, type Board, type Line, type Player } from '../game/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Overlay coordinate system: each cell is 100 × 100 units. */
const CELL_UNITS = 100;
const BOARD_UNITS = CELL_UNITS * SIZE;
/** How far the winning strike reaches past the centres of the end cells. */
const STRIKE_OVERSHOOT = 38;

/** Hand-drawn strokes (viewBox 0 0 100 100). Slight curves keep them from looking machine-made. */
const X_PATHS = ['M22 22 C38 40 56 58 78 79', 'M78 22 C60 40 42 59 22 78'];
const O_PATHS = ['M52 18 C30 16 18 34 20 52 C22 72 38 83 55 81 C73 79 83 63 81 46 C79 29 66 18 46 21'];
/** Four wobbly grid lines (viewBox 0 0 300 300). */
const GRID_PATHS = [
  'M101 6 C99 80 102 170 100 294',
  'M200 6 C202 90 198 190 201 294',
  'M6 100 C90 102 190 98 294 101',
  'M6 201 C100 199 200 203 294 200',
];

const OUTCOME_TEXT: Record<Outcome, string> = { win: 'Win', draw: 'Draw', loss: 'Lose' };

/** Everything the board needs to draw itself. */
export interface BoardViewState {
  readonly board: Board;
  /** Mark previewed on hover, or `null` when no preview should show. */
  readonly previewMark: Player | null;
  /** When `true` the board ignores input (AI thinking, game over, not your turn). */
  readonly locked: boolean;
  /** Outcome labels for empty cells ("Show AI thinking"), or `null`. */
  readonly hints: ReadonlyMap<number, Outcome> | null;
  /** The winning line to strike through, or `null`. */
  readonly winLine: Line | null;
}

/**
 * Renders the 3×3 board as accessible buttons with SVG marks, and handles
 * pointer and keyboard input on it.
 */
export class BoardView {
  private readonly cells: HTMLButtonElement[] = [];
  private readonly rendered: (Player | null)[] = Array<Player | null>(CELL_COUNT).fill(null);
  private readonly strikeLayer: SVGSVGElement;
  private shownLine: Line | null = null;

  /**
   * @param root   the empty board container
   * @param onPlay called with a cell index when the player chooses an empty, unlocked square
   */
  constructor(
    private readonly root: HTMLElement,
    private readonly onPlay: (index: number) => void,
  ) {
    const lines = svg('svg', { class: 'board-lines sketch', viewBox: `0 0 ${BOARD_UNITS} ${BOARD_UNITS}`, 'aria-hidden': 'true' });
    for (const d of GRID_PATHS) lines.append(svg('path', { class: 'grid-line', d, pathLength: '1' }));
    this.strikeLayer = svg('svg', { class: 'board-lines board-strike', viewBox: `0 0 ${BOARD_UNITS} ${BOARD_UNITS}`, 'aria-hidden': 'true' });

    for (let i = 0; i < CELL_COUNT; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell empty';
      cell.dataset.index = String(i);
      cell.tabIndex = i === 0 ? 0 : -1; // roving tab index: one tab stop for the whole grid
      cell.addEventListener('click', () => this.activate(i));
      cell.addEventListener('keydown', (event) => this.onKeyDown(event, i));
      cell.addEventListener('focus', () => this.setTabStop(i));
      this.cells.push(cell);
      root.append(cell);
    }
    root.append(lines, this.strikeLayer);
  }

  /** Brings the board in line with the given state, animating only what changed. */
  update(state: BoardViewState): void {
    this.root.classList.toggle('locked', state.locked);
    this.root.setAttribute('aria-disabled', String(state.locked));

    for (let i = 0; i < CELL_COUNT; i++) {
      const cell = this.cells[i];
      const mark = state.board[i];
      if (mark !== this.rendered[i]) {
        cell.querySelector('.mark')?.remove();
        if (mark !== null) cell.append(markSvg(mark, 'mark draw'));
        this.rendered[i] = mark;
      }

      cell.classList.toggle('empty', mark === null);
      cell.classList.toggle('win', state.winLine?.includes(i) ?? false);

      cell.querySelector('.preview')?.remove();
      if (mark === null && state.previewMark !== null) {
        cell.append(markSvg(state.previewMark, 'mark preview'));
      }

      cell.querySelector('.hint')?.remove();
      const outcome = mark === null ? state.hints?.get(i) : undefined;
      if (outcome !== undefined) {
        const hint = document.createElement('span');
        hint.className = `hint hint-${outcome}`;
        hint.textContent = OUTCOME_TEXT[outcome];
        cell.append(hint);
      }

      cell.setAttribute('aria-label', cellLabel(i, mark, outcome));
    }

    this.updateStrike(state.winLine);
  }

  /** Gives the board a short shake (used for a draw). */
  shake(): void {
    this.root.classList.remove('shake');
    void this.root.offsetWidth; // restart the animation if it is already applied
    this.root.classList.add('shake');
    this.root.addEventListener('animationend', () => this.root.classList.remove('shake'), { once: true });
  }

  /** @returns `true` if one of the board's cells has keyboard focus */
  hasFocus(): boolean {
    return this.cells.some((cell) => cell === document.activeElement);
  }

  private activate(index: number): void {
    if (this.root.classList.contains('locked') || this.rendered[index] !== null) return;
    this.onPlay(index);
  }

  private onKeyDown(event: KeyboardEvent, index: number): void {
    const { row, col } = rowCol(index);
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const delta = moves[event.key];
    if (!delta) return; // Enter and Space trigger the button's click
    event.preventDefault();
    const nextRow = (row + delta[0] + SIZE) % SIZE;
    const nextCol = (col + delta[1] + SIZE) % SIZE;
    this.cells[nextRow * SIZE + nextCol].focus();
  }

  private setTabStop(index: number): void {
    this.cells.forEach((cell, i) => {
      cell.tabIndex = i === index ? 0 : -1;
    });
  }

  private updateStrike(line: Line | null): void {
    if (line === this.shownLine) return;
    this.shownLine = line;
    this.strikeLayer.replaceChildren();
    if (line === null) return;

    const start = cellCentre(line[0]);
    const end = cellCentre(line[2]);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const ux = (dx / length) * STRIKE_OVERSHOOT;
    const uy = (dy / length) * STRIKE_OVERSHOOT;
    // A gentle bow in the middle makes it look drawn by hand.
    const midX = (start.x + end.x) / 2 + uy * 0.12;
    const midY = (start.y + end.y) / 2 - ux * 0.12;
    const d = `M${start.x - ux} ${start.y - uy} Q${midX} ${midY} ${end.x + ux} ${end.y + uy}`;
    this.strikeLayer.append(svg('path', { class: 'strike', d, pathLength: '1' }));
  }
}

function cellCentre(index: number): { x: number; y: number } {
  const { row, col } = rowCol(index);
  return { x: col * CELL_UNITS + CELL_UNITS / 2, y: row * CELL_UNITS + CELL_UNITS / 2 };
}

function cellLabel(index: number, mark: Player | null, outcome: Outcome | undefined): string {
  const { row, col } = rowCol(index);
  const base = `Row ${row + 1}, column ${col + 1}, ${mark ?? 'empty'}`;
  return outcome ? `${base}, leads to a ${outcome === 'loss' ? 'loss' : outcome}` : base;
}

function markSvg(mark: Player, className: string): SVGSVGElement {
  const el = svg('svg', {
    class: `${className} mark-${mark.toLowerCase()}`,
    viewBox: '0 0 100 100',
    'aria-hidden': 'true',
  });
  for (const d of mark === 'X' ? X_PATHS : O_PATHS) el.append(svg('path', { d, pathLength: '1' }));
  return el;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  return el;
}
