import type { Difficulty } from '../ai/difficulty';
import type { Player } from '../game/types';
import type { ThemeSetting } from '../ui/theme';

/** Who you are playing against. */
export type Mode = 'cpu' | 'pvp';

/** Preferences remembered between visits. */
export interface Settings {
  mode: Mode;
  /** Which mark you play against the computer. */
  humanPlays: Player;
  difficulty: Difficulty;
  theme: ThemeSetting;
  sound: boolean;
  showThinking: boolean;
}

/** The running scoreboard. */
export interface Scores {
  X: number;
  O: number;
  draws: number;
}

const SETTINGS_KEY = 'ttt.settings';
const SCORES_KEY = 'ttt.scores';

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  mode: 'cpu',
  humanPlays: 'X',
  difficulty: 'hard',
  theme: 'system',
  sound: false,
  showThinking: false,
};

export const EMPTY_SCORES: Readonly<Scores> = { X: 0, O: 0, draws: 0 };

/** Loads settings, falling back to defaults for anything missing, invalid or unreadable. */
export function loadSettings(): Settings {
  const saved = read(SETTINGS_KEY);
  const s = { ...DEFAULT_SETTINGS };
  if (saved && typeof saved === 'object') {
    const v = saved as Record<string, unknown>;
    if (v.mode === 'cpu' || v.mode === 'pvp') s.mode = v.mode;
    if (v.humanPlays === 'X' || v.humanPlays === 'O') s.humanPlays = v.humanPlays;
    if (v.difficulty === 'easy' || v.difficulty === 'medium' || v.difficulty === 'hard') s.difficulty = v.difficulty;
    if (v.theme === 'system' || v.theme === 'light' || v.theme === 'dark') s.theme = v.theme;
    if (typeof v.sound === 'boolean') s.sound = v.sound;
    if (typeof v.showThinking === 'boolean') s.showThinking = v.showThinking;
  }
  return s;
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

/** Loads the scoreboard, or zeros if nothing valid is saved. */
export function loadScores(): Scores {
  const saved = read(SCORES_KEY);
  const scores = { ...EMPTY_SCORES };
  if (saved && typeof saved === 'object') {
    const v = saved as Record<string, unknown>;
    for (const key of ['X', 'O', 'draws'] as const) {
      const n = v[key];
      if (typeof n === 'number' && Number.isInteger(n) && n >= 0) scores[key] = n;
    }
  }
  return scores;
}

export function saveScores(scores: Scores): void {
  write(SCORES_KEY, scores);
}

// Storage can be missing or throw (private mode, blocked cookies, embedded frames);
// the game keeps working either way, it just won't remember anything.
function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore: storage unavailable
  }
}
