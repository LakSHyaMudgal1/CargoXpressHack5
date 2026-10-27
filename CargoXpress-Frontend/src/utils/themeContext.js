import { createContext, useContext } from 'react';
import { THEME_PRESETS, DEFAULT_THEME_ID } from './themePresets';

export const ThemeContext = createContext({
  theme: DEFAULT_THEME_ID,
  currentTheme: THEME_PRESETS[0],
  presets: THEME_PRESETS,
  defaultThemeId: DEFAULT_THEME_ID,
  setTheme: () => {},
  resetTheme: () => {},
  isDefault: true,
  isDark: true,
});

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
