'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Theme, themes } from './themes';

interface ThemeContextType {
  theme: Theme;
  setTheme: (themeId: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedThemeId = localStorage.getItem('theme');
      const savedTheme = themes.find(t => t.id === savedThemeId);
      return savedTheme || themes[0];
    }
    return themes[0];
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode');
      return savedDarkMode === 'true';
    }
    return false;
  });

  const applyTheme = useCallback((currentTheme: Theme, darkMode: boolean) => {
    const root = document.documentElement;
    const colors = darkMode ? {
      primary: currentTheme.colors.primary,
      secondary: currentTheme.colors.secondary,
      accent: currentTheme.colors.accent,
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      border: '#334155',
    } : currentTheme.colors;
    
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-border', colors.border);
    
    root.style.setProperty('--gradient-primary', currentTheme.gradients.primary);
    root.style.setProperty('--gradient-secondary', currentTheme.gradients.secondary);
    root.style.setProperty('--gradient-background', currentTheme.gradients.background);
    
    root.style.setProperty('--effect-shadow', currentTheme.effects.shadow);
    root.style.setProperty('--effect-glow', currentTheme.effects.glow);
  }, []);

  const setTheme = (themeId: string) => {
    const newTheme = themes.find(t => t.id === themeId) || themes[0];
    setThemeState(newTheme);
    localStorage.setItem('theme', themeId);
    applyTheme(newTheme, isDarkMode);
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    applyTheme(theme, newDarkMode);
  };

  useEffect(() => {
    applyTheme(theme, isDarkMode);
  }, [theme, isDarkMode, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
