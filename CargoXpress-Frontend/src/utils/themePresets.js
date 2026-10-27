/**
 * CargoXpress Theme Presets Definition
 * 5 curated enterprise palettes with distinct visual aesthetics and strict semantic signal integrity.
 */
export const THEME_PRESETS = [
  {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    description: 'Flagship obsidian dark theme with cyan & emerald signals',
    swatch: {
      bg: '#07090E',
      surface: '#0E131F',
      accent: '#10B981',
      ink: '#F8FAFC',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    mode: 'light',
    description: 'Professional blue accents and clean light surfaces',
    swatch: {
      bg: '#F1F5F9',
      surface: '#FFFFFF',
      accent: '#0284C7',
      ink: '#0F172A',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    mode: 'dark',
    description: 'Restrained slate and charcoal with high-tech sky blue',
    swatch: {
      bg: '#11141A',
      surface: '#1C212B',
      accent: '#38BDF8',
      ink: '#F8FAFC',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    mode: 'dark',
    description: 'Muted green accents, deep pine, and botanical sage surfaces',
    swatch: {
      bg: '#0B120E',
      surface: '#16221C',
      accent: '#10B981',
      ink: '#F2F7F4',
    },
  },
  {
    id: 'sand',
    name: 'Warm Sand',
    mode: 'light',
    description: 'Warm alabaster ivory and earthy terracotta accents',
    swatch: {
      bg: '#F7F5EE',
      surface: '#FFFFFF',
      accent: '#C2410C',
      ink: '#1C1917',
    },
  },
];

export const DEFAULT_THEME_ID = 'midnight';
export const THEME_STORAGE_KEY = 'cargoxpress_theme';

/**
 * Checks whether a theme ID exists in the preset registry.
 * @param {string} id
 * @returns {boolean}
 */
export function isValidThemeId(id) {
  return typeof id === 'string' && THEME_PRESETS.some((p) => p.id === id);
}

/**
 * Retrieves a theme preset by ID with automatic fallback to DEFAULT_THEME_ID.
 * @param {string} id
 * @returns {typeof THEME_PRESETS[0]}
 */
export function getThemePreset(id) {
  return THEME_PRESETS.find((p) => p.id === id) || THEME_PRESETS[0];
}

/**
 * Sanitizes an untrusted or stored theme ID.
 * Returns the validated ID or DEFAULT_THEME_ID if invalid.
 * @param {unknown} id
 * @returns {string}
 */
export function sanitizeThemeId(id) {
  if (typeof id === 'string' && isValidThemeId(id)) {
    return id;
  }
  return DEFAULT_THEME_ID;
}

/**
 * Applies the given theme directly to the DOM root element.
 * @param {string} themeId
 * @param {HTMLElement} [targetElement]
 * @returns {{ id: string, mode: string, isDark: boolean }}
 */
export function applyThemeToDOM(themeId, targetElement) {
  const safeId = sanitizeThemeId(themeId);
  const preset = getThemePreset(safeId);
  const isDark = preset.mode === 'dark';

  const root = targetElement || (typeof document !== 'undefined' ? document.documentElement : null);
  if (root) {
    root.setAttribute('data-theme', safeId);
    root.setAttribute('data-theme-mode', preset.mode);
    if (root.classList) {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }

  return { id: safeId, mode: preset.mode, isDark };
}

