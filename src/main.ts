import './styles.css';
import { pickMove, type Difficulty } from './ai/difficulty';
import { outcomeOf, scoreMoves, type Outcome } from './ai/minimax';
import { applyMove, createBoard, currentPlayer, getResult, isValidMove, opponent } from './game/board';
import type { Board, GameResult, Player } from './game/types';
import { loadScores, loadSettings, saveScores, saveSettings, EMPTY_SCORES, type Mode } from './state/store';
import { confetti } from './ui/animations';
import { BoardView } from './ui/render';
import { Sound } from './ui/sound';
import { applyTheme, cssVar, effectiveTheme, watchSystemTheme } from './ui/theme';

/** The computer pauses this long (randomly between the two) so its move feels natural. */
const MIN_THINK_MS = 300;
const MAX_THINK_MS = 600;

// ------------------------------------------------------------------ state

const settings = loadSettings();
const scores = loadScores();
const sound = new Sound(settings.sound);

/** Every position of the current game, oldest first. The last one is on screen. */
let history: Board[] = [createBoard()];
let thinking = false;
let aiTimer: number | null = null;
/** Guards against counting the same finished game twice. */
let resultRecorded = false;

// ------------------------------------------------------------------ elements

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const ui = {
  status: byId<HTMLParagraphElement>('status'),
  board: byId<HTMLDivElement>('board'),
  newGame: byId<HTMLButtonElement>('new-game'),
  undo: byId<HTMLButtonElement>('undo'),
  settings: document.querySelector<HTMLElement>('.settings')!,
  showThinking: byId<HTMLInputElement>('show-thinking'),
  sound: byId<HTMLInputElement>('sound'),
  themeToggle: byId<HTMLButtonElement>('theme-toggle'),
  resetScores: byId<HTMLButtonElement>('reset-scores'),
  scoreX: byId<HTMLSpanElement>('score-x'),
  scoreO: byId<HTMLSpanElement>('score-o'),
  scoreDraws: byId<HTMLSpanElement>('score-draws'),
  labelX: byId<HTMLSpanElement>('label-x'),
  labelO: byId<HTMLSpanElement>('label-o'),
  help: byId<HTMLDialogElement>('help'),
  openHelp: byId<HTMLButtonElement>('open-help'),
  confetti: byId<HTMLCanvasElement>('confetti'),
};

const view = new BoardView(ui.board, playerMove);

// ------------------------------------------------------------------ game flow

function position(): Board {
  return history[history.length - 1];
}

/** The computer's mark, or `null` when two people are playing. */
function computerPlays(): Player | null {
  return settings.mode === 'cpu' ? opponent(settings.humanPlays) : null;
}

function isComputerTurn(): boolean {
  const cpu = computerPlays();
  return cpu !== null && !getResult(position()).over && currentPlayer(position()) === cpu;
}

/** Called when a person picks a square. */
function playerMove(index: number): void {
  if (thinking || isComputerTurn() || !isValidMove(position(), index)) return;
  play(index);
}

function play(index: number): void {
  history.push(applyMove(position(), index));
  sound.play('place');
  const result = getResult(position());
  if (result.over) {
    render();
    finishGame(result);
    return;
  }
  if (isComputerTurn()) startComputerTurn();
  render();
}

/**
 * The move is chosen instantly; the pause only exists so the reply doesn't feel abrupt.
 * If the position changes meanwhile (new game, undo), the pending move is discarded.
 */
function startComputerTurn(): void {
  const board = position();
  const move = pickMove(board, settings.difficulty);
  const delay = MIN_THINK_MS + Math.random() * (MAX_THINK_MS - MIN_THINK_MS);
  thinking = true;
  aiTimer = window.setTimeout(() => {
    aiTimer = null;
    thinking = false;
    if (position() === board) play(move);
  }, delay);
}

function cancelComputerTurn(): void {
  if (aiTimer !== null) window.clearTimeout(aiTimer);
  aiTimer = null;
  thinking = false;
}

function finishGame(result: GameResult): void {
  if (resultRecorded) return;
  resultRecorded = true;
  if (result.winner) scores[result.winner]++;
  else scores.draws++;
  saveScores(scores);
  renderScores();

  if (result.draw) {
    view.shake();
    sound.play('draw');
    return;
  }
  const celebrate = settings.mode === 'pvp' || result.winner === settings.humanPlays;
  if (celebrate) {
    confetti(ui.confetti, [cssVar('--x'), cssVar('--o'), cssVar('--hint-win'), cssVar('--hint-draw')]);
    sound.play('win');
  } else {
    sound.play('lose');
  }
}

function newGame(): void {
  cancelComputerTurn();
  history = [createBoard()];
  resultRecorded = false;
  if (isComputerTurn()) startComputerTurn();
  render();
}

/**
 * Where Undo goes back to: against the computer, to before your last move (so the
 * computer's reply is undone too); against a friend, one move back.
 * Finished games can't be undone, so the score stays honest.
 *
 * @returns an index into `history`, or -1 if there is nothing to undo
 */
function undoTarget(): number {
  const last = history.length - 1;
  if (last === 0 || getResult(position()).over) return -1;
  if (settings.mode === 'pvp') return last - 1;

  const human = settings.humanPlays;
  const marks = (b: Board): number => b.filter((cell) => cell === human).length;
  const now = marks(position());
  for (let i = last - 1; i >= 0; i--) {
    if (currentPlayer(history[i]) === human && marks(history[i]) < now) return i;
  }
  return -1;
}

function undo(): void {
  const target = undoTarget();
  if (target < 0) return;
  cancelComputerTurn();
  history = history.slice(0, target + 1);
  render();
}

// ------------------------------------------------------------------ rendering

function render(): void {
  const board = position();
  const result = getResult(board);
  const computerTurn = isComputerTurn();
  const locked = result.over || thinking || computerTurn;

  let hints: Map<number, Outcome> | null = null;
  if (settings.showThinking && !locked) {
    hints = new Map(scoreMoves(board).map((m) => [m.index, outcomeOf(m.score)]));
  }

  view.update({
    board,
    previewMark: locked ? null : currentPlayer(board),
    locked,
    hints,
    winLine: result.line,
  });

  renderStatus(result, computerTurn);
  renderScores();
  ui.undo.disabled = undoTarget() < 0;
  ui.settings.classList.toggle('pvp', settings.mode === 'pvp');
  renderControls();
}

function renderStatus(result: GameResult, computerTurn: boolean): void {
  const cpu = settings.mode === 'cpu';
  if (!result.over && computerTurn) {
    ui.status.textContent = 'Computer is thinking';
    const dots = document.createElement('span');
    dots.className = 'dots';
    dots.setAttribute('aria-hidden', 'true');
    ui.status.append(dots);
    return;
  }
  let text: string;
  if (result.draw) text = 'Draw';
  else if (result.winner) {
    if (!cpu) text = `${result.winner} wins!`;
    else text = result.winner === settings.humanPlays ? 'You win!' : 'Computer wins';
  } else {
    text = cpu ? 'Your turn' : `${currentPlayer(position())}'s turn`;
  }
  ui.status.textContent = text;
}

function renderScores(): void {
  ui.scoreX.textContent = String(scores.X);
  ui.scoreO.textContent = String(scores.O);
  ui.scoreDraws.textContent = String(scores.draws);
  if (settings.mode === 'cpu') {
    ui.labelX.textContent = settings.humanPlays === 'X' ? 'You' : 'Computer';
    ui.labelO.textContent = settings.humanPlays === 'O' ? 'You' : 'Computer';
  } else {
    ui.labelX.textContent = 'Player 1';
    ui.labelO.textContent = 'Player 2';
  }
}

function renderControls(): void {
  setRadio('mode', settings.mode);
  setRadio('side', settings.humanPlays);
  setRadio('difficulty', settings.difficulty);
  ui.showThinking.checked = settings.showThinking;
  ui.sound.checked = settings.sound;
  const next = effectiveTheme(settings.theme) === 'dark' ? 'light' : 'dark';
  ui.themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
  ui.themeToggle.title = `Switch to ${next} theme`;
}

function setRadio(name: string, value: string): void {
  const input = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

// ------------------------------------------------------------------ events

function onRadio(name: string, handler: (value: string) => void): void {
  document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) handler(input.value);
    });
  });
}

onRadio('mode', (value) => {
  settings.mode = value as Mode;
  saveSettings(settings);
  newGame();
});

onRadio('side', (value) => {
  settings.humanPlays = value as Player;
  saveSettings(settings);
  newGame();
});

onRadio('difficulty', (value) => {
  settings.difficulty = value as Difficulty;
  saveSettings(settings);
  render();
});

ui.showThinking.addEventListener('change', () => {
  settings.showThinking = ui.showThinking.checked;
  saveSettings(settings);
  render();
});

ui.sound.addEventListener('change', () => {
  settings.sound = ui.sound.checked;
  sound.enabled = settings.sound;
  saveSettings(settings);
  sound.play('place'); // a quick confirmation that sound is on
});

ui.themeToggle.addEventListener('click', () => {
  settings.theme = effectiveTheme(settings.theme) === 'dark' ? 'light' : 'dark';
  applyTheme(settings.theme);
  saveSettings(settings);
  renderControls();
});

ui.resetScores.addEventListener('click', () => {
  Object.assign(scores, EMPTY_SCORES);
  saveScores(scores);
  renderScores();
});

ui.newGame.addEventListener('click', newGame);
ui.undo.addEventListener('click', undo);
ui.openHelp.addEventListener('click', () => ui.help.showModal());

document.addEventListener('keydown', (event) => {
  if (ui.help.open || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target as HTMLElement | null;
  const inFormControl = target instanceof HTMLInputElement;
  const key = event.key.toLowerCase();
  if (key === 'n') {
    newGame();
  } else if (key === 'u') {
    undo();
  } else if (key.startsWith('arrow') && !inFormControl && !view.hasFocus()) {
    // Arrow keys anywhere else jump onto the board.
    event.preventDefault();
    ui.board.querySelector<HTMLButtonElement>('.cell[tabindex="0"]')?.focus();
  }
});

// ------------------------------------------------------------------ start

applyTheme(settings.theme);
watchSystemTheme(() => settings.theme, renderControls);
newGame();
