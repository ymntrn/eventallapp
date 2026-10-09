import { useEffect, useSyncExternalStore } from 'react';
import type { ThemeSetting } from './store';

export type Theme = 'light' | 'dark';

const query = '(prefers-color-scheme: dark)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** Resolves the setting ("system" follows the OS) and applies it to <html data-theme>. */
export function useTheme(setting: ThemeSetting): Theme {
  const systemDark = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
  const theme: Theme = setting === 'system' ? (systemDark ? 'dark' : 'light') : setting;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f1115' : '#ffffff');
  }, [theme]);

  return theme;
}
