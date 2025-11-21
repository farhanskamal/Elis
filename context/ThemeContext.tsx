import React, { createContext, useEffect, useMemo, useState } from 'react';

export type Theme = {
  mode: 'system' | 'light' | 'dark';
  primary: string; // hex
  secondary: string; // hex
  background: string; // hex
  textPrimary: string; // hex
  textSecondary: string; // hex
};

type ThemeContextType = {
  theme: Theme;
  setTheme: (t: Partial<Theme>) => void;
  resetTheme: () => void;
  loadUserTheme: (userThemePreferences?: any) => void;
};

const DEFAULT_THEME: Theme = {
  mode: 'system',
  primary: '#2563eb',
  secondary: '#64748b',
  background: '#f9fafb',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  resetTheme: () => {},
  loadUserTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, _setTheme] = useState<Theme>(DEFAULT_THEME);

  const applyCssVars = (t: Theme) => {
    const root = document.documentElement as HTMLElement;
    root.style.setProperty('--color-primary', t.primary);
    root.style.setProperty('--color-secondary', t.secondary);
    root.style.setProperty('--color-bg', t.background);
    root.style.setProperty('--text-primary', t.textPrimary);
    root.style.setProperty('--text-secondary', t.textSecondary);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = t.mode === 'dark' || (t.mode === 'system' && prefersDark);
    root.classList.toggle('dark', isDark);
  };

  useEffect(() => {
    applyCssVars(theme);
  }, [theme]);

  const setTheme = (t: Partial<Theme>) => _setTheme(prev => ({ ...prev, ...t }));
  const resetTheme = () => _setTheme(DEFAULT_THEME);
  
  const loadUserTheme = (userThemePreferences?: any) => {
    if (userThemePreferences) {
      _setTheme({ ...DEFAULT_THEME, ...userThemePreferences });
    } else {
      _setTheme(DEFAULT_THEME);
    }
  };

  const value = useMemo(() => ({ theme, setTheme, resetTheme, loadUserTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

