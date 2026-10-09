export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'ts-theme';

export const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

const labelFor = (theme: Theme) =>
  theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

function syncButtons(theme: Theme) {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
    button.setAttribute('aria-label', labelFor(theme));
  }
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
  syncButtons(theme);
}

export function initThemeToggles() {
  syncButtons(currentTheme());
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
    button.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  }
}
