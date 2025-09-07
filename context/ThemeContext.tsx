import React, { createContext, useEffect, useMemo, useState } from 'react';

export type Theme = {
  mode: 'system' | 'light' | 'dark';
  primary: string; // hex
  secondary: string; // hex
  background: string; // hex
};

type ThemeContextType = {
  theme: Theme;
  setTheme: (t: Partial<Theme>) => void;
  resetTheme: () => void;
};

const DEFAULT_THEME: Theme = {
  mode: 'system',
  primary: '#2563eb',
  secondary: '#64748b',
  background: '#f9fafb',
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  resetTheme: () => {},
});

const STORAGE_KEY = 'elis.theme.v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, _setTheme] = useState<Theme>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_THEME, ...JSON.parse(raw) } : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const applyCssVars = (t: Theme) => {
    const root = document.documentElement as HTMLElement;
    root.style.setProperty('--color-primary', t.primary);
    root.style.setProperty('--color-secondary', t.secondary);
    root.style.setProperty('--color-bg', t.background);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = t.mode === 'dark' || (t.mode === 'system' && prefersDark);
    root.classList.toggle('theme-dark', isDark);
  };

  useEffect(() => {
    applyCssVars(theme);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)); } catch {}
  }, [theme]);

  const setTheme = (t: Partial<Theme>) => _setTheme(prev => ({ ...prev, ...t }));
  const resetTheme = () => _setTheme(DEFAULT_THEME);

  const value = useMemo(() => ({ theme, setTheme, resetTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

