/** The user's theme choice: follow the system, or force light or dark. */
export type ThemeSetting = 'system' | 'light' | 'dark';

const darkQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)');

/** @returns the theme actually on screen */
export function effectiveTheme(setting: ThemeSetting): 'light' | 'dark' {
  if (setting !== 'system') return setting;
  return darkQuery().matches ? 'dark' : 'light';
}

/**
 * Applies a theme. `data-theme` forces a theme (the CSS otherwise follows the system);
 * `data-effective-theme` always holds what is on screen, for icons and accents.
 */
export function applyTheme(setting: ThemeSetting): void {
  const root = document.documentElement;
  if (setting === 'system') delete root.dataset.theme;
  else root.dataset.theme = setting;
  root.dataset.effectiveTheme = effectiveTheme(setting);
}

/** Re-applies the theme whenever the system theme changes, while following the system. */
export function watchSystemTheme(getSetting: () => ThemeSetting, onChange: () => void): void {
  darkQuery().addEventListener('change', () => {
    if (getSetting() === 'system') {
      applyTheme('system');
      onChange();
    }
  });
}

/** @returns the colour of a CSS custom property on the root element */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
