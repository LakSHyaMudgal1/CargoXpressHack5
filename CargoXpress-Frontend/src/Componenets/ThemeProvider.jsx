import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeContext } from '../utils/themeContext';
import {
  THEME_PRESETS,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  sanitizeThemeId,
  getThemePreset,
  applyThemeToDOM,
} from '../utils/themePresets';

const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        return sanitizeThemeId(raw);
      } catch (err) {
        console.warn('Unable to read stored theme from localStorage:', err);
      }
    }
    return DEFAULT_THEME_ID;
  });

  const currentTheme = useMemo(() => getThemePreset(theme), [theme]);
  const isDark = currentTheme.mode === 'dark';
  const isDefault = theme === DEFAULT_THEME_ID;

  const setTheme = useCallback((newThemeId) => {
    const safeId = sanitizeThemeId(newThemeId);
    setThemeState(safeId);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, safeId);
      }
    } catch (err) {
      console.warn('Unable to persist theme to localStorage:', err);
    }
    applyThemeToDOM(safeId);
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME_ID);
  }, [setTheme]);

  // Synchronize with DOM and localStorage whenever theme changes
  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (err) {
      console.warn('Unable to persist theme to localStorage:', err);
    }
  }, [theme]);

  // Cross-tab synchronization via storage event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e) => {
      if (e.key === THEME_STORAGE_KEY) {
        const updatedTheme = sanitizeThemeId(e.newValue);
        setThemeState(updatedTheme);
        applyThemeToDOM(updatedTheme);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const contextValue = useMemo(
    () => ({
      theme,
      currentTheme,
      presets: THEME_PRESETS,
      defaultThemeId: DEFAULT_THEME_ID,
      setTheme,
      resetTheme,
      isDefault,
      isDark,
    }),
    [theme, currentTheme, isDefault, isDark, setTheme, resetTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
