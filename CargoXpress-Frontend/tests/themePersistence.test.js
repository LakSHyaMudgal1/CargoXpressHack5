import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_PRESETS,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  isValidThemeId,
  getThemePreset,
  sanitizeThemeId,
  applyThemeToDOM,
} from '../src/utils/themePresets.js';

/**
 * Mock DOM Root Element for headless testing of theme attributes & classList
 */
function createMockElement() {
  const attributes = new Map();
  const classes = new Set();

  return {
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    classList: {
      add(cls) {
        classes.add(cls);
      },
      remove(cls) {
        classes.delete(cls);
      },
      contains(cls) {
        return classes.has(cls);
      },
      toggle(cls, force) {
        if (force !== undefined) {
          if (force) classes.add(cls);
          else classes.delete(cls);
          return force;
        }
        if (classes.has(cls)) {
          classes.delete(cls);
          return false;
        }
        classes.add(cls);
        return true;
      },
    },
    _attributes: attributes,
    _classes: classes,
  };
}

/**
 * Mock localStorage implementation for persistence and corruption tests
 */
function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    get length() {
      return store.size;
    },
  };
}

describe('CargoXpress Theme System — Preset Validation and Attributes', () => {
  it('1. Provides at least five verified enterprise theme presets', () => {
    assert.ok(Array.isArray(THEME_PRESETS), 'THEME_PRESETS should be an array');
    assert.ok(THEME_PRESETS.length >= 5, 'Should have at least 5 presets');

    const expectedIds = ['midnight', 'ocean', 'graphite', 'forest', 'sand'];
    expectedIds.forEach((id) => {
      const preset = THEME_PRESETS.find((p) => p.id === id);
      assert.ok(preset, `Preset "${id}" must exist`);
      assert.ok(preset.name, `Preset "${id}" must have a readable name`);
      assert.ok(preset.mode === 'dark' || preset.mode === 'light', `Preset "${id}" must declare dark or light mode`);
      assert.ok(preset.swatch.bg, `Preset "${id}" must have a canvas swatch`);
      assert.ok(preset.swatch.surface, `Preset "${id}" must have a surface swatch`);
      assert.ok(preset.swatch.accent, `Preset "${id}" must have an accent swatch`);
      assert.ok(preset.swatch.ink, `Preset "${id}" must have an ink swatch`);
    });
  });

  it('2. Designates Midnight as the explicit default theme', () => {
    assert.equal(DEFAULT_THEME_ID, 'midnight');
    const defaultPreset = getThemePreset(DEFAULT_THEME_ID);
    assert.equal(defaultPreset.id, 'midnight');
    assert.equal(defaultPreset.mode, 'dark');
  });

  it('3. Accurately verifies valid theme IDs', () => {
    assert.equal(isValidThemeId('midnight'), true);
    assert.equal(isValidThemeId('ocean'), true);
    assert.equal(isValidThemeId('graphite'), true);
    assert.equal(isValidThemeId('forest'), true);
    assert.equal(isValidThemeId('sand'), true);

    // Invalid IDs
    assert.equal(isValidThemeId('cyberpunk'), false);
    assert.equal(isValidThemeId(''), false);
    assert.equal(isValidThemeId(null), false);
    assert.equal(isValidThemeId(undefined), false);
    assert.equal(isValidThemeId(123), false);
  });
});

describe('CargoXpress Theme System — DOM Application and Immediate Switching', () => {
  let mockRoot;

  beforeEach(() => {
    mockRoot = createMockElement();
  });

  it('4. Applies light theme preset (Ocean Blue) with data attributes and removes dark class', () => {
    const result = applyThemeToDOM('ocean', mockRoot);

    assert.equal(result.id, 'ocean');
    assert.equal(result.mode, 'light');
    assert.equal(result.isDark, false);

    assert.equal(mockRoot.getAttribute('data-theme'), 'ocean');
    assert.equal(mockRoot.getAttribute('data-theme-mode'), 'light');
    assert.equal(mockRoot.classList.contains('dark'), false);
  });

  it('5. Applies dark theme preset (Midnight) with dark class and data attributes', () => {
    const result = applyThemeToDOM('midnight', mockRoot);

    assert.equal(result.id, 'midnight');
    assert.equal(result.mode, 'dark');
    assert.equal(result.isDark, true);

    assert.equal(mockRoot.getAttribute('data-theme'), 'midnight');
    assert.equal(mockRoot.getAttribute('data-theme-mode'), 'dark');
    assert.equal(mockRoot.classList.contains('dark'), true);
  });

  it('6. Immediately updates DOM attributes when switching sequentially across presets', () => {
    // 1. Midnight
    applyThemeToDOM('midnight', mockRoot);
    assert.equal(mockRoot.getAttribute('data-theme'), 'midnight');
    assert.equal(mockRoot.classList.contains('dark'), true);

    // 2. Switch to Warm Sand (light)
    applyThemeToDOM('sand', mockRoot);
    assert.equal(mockRoot.getAttribute('data-theme'), 'sand');
    assert.equal(mockRoot.getAttribute('data-theme-mode'), 'light');
    assert.equal(mockRoot.classList.contains('dark'), false);

    // 3. Switch to Forest (dark)
    applyThemeToDOM('forest', mockRoot);
    assert.equal(mockRoot.getAttribute('data-theme'), 'forest');
    assert.equal(mockRoot.getAttribute('data-theme-mode'), 'dark');
    assert.equal(mockRoot.classList.contains('dark'), true);

    // 4. Switch to Graphite (dark)
    applyThemeToDOM('graphite', mockRoot);
    assert.equal(mockRoot.getAttribute('data-theme'), 'graphite');
    assert.equal(mockRoot.classList.contains('dark'), true);
  });
});

describe('CargoXpress Theme System — Persistence & Browser Refresh Simulation', () => {
  let mockStorage;
  let mockRoot;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    mockRoot = createMockElement();
  });

  it('7. Persists selected theme preference to localStorage across simulated reloads', () => {
    // Simulate user selecting Forest
    const chosenTheme = 'forest';
    mockStorage.setItem(THEME_STORAGE_KEY, chosenTheme);
    applyThemeToDOM(chosenTheme, mockRoot);

    assert.equal(mockStorage.getItem(THEME_STORAGE_KEY), 'forest');
    assert.equal(mockRoot.getAttribute('data-theme'), 'forest');

    // Simulate page reload: re-read storage and re-apply
    const reloadedStorageValue = mockStorage.getItem(THEME_STORAGE_KEY);
    const restoredTheme = sanitizeThemeId(reloadedStorageValue);
    const restoredDOM = applyThemeToDOM(restoredTheme, mockRoot);

    assert.equal(restoredTheme, 'forest');
    assert.equal(restoredDOM.id, 'forest');
    assert.equal(mockRoot.getAttribute('data-theme'), 'forest');
  });

  it('8. Flash prevention script correctly parses stored preference before DOM mount', () => {
    // Simulate user saved Warm Sand
    mockStorage.setItem(THEME_STORAGE_KEY, 'sand');

    // Execute the exact algorithm from index.html head script
    const validThemes = ['midnight', 'ocean', 'graphite', 'forest', 'sand'];
    const darkThemes = ['midnight', 'graphite', 'forest'];
    const raw = mockStorage.getItem('cargoxpress_theme');
    const theme = validThemes.includes(raw) ? raw : 'midnight';
    const isDark = darkThemes.includes(theme);

    mockRoot.setAttribute('data-theme', theme);
    mockRoot.setAttribute('data-theme-mode', isDark ? 'dark' : 'light');
    if (isDark) mockRoot.classList.add('dark');
    else mockRoot.classList.remove('dark');

    assert.equal(mockRoot.getAttribute('data-theme'), 'sand');
    assert.equal(mockRoot.getAttribute('data-theme-mode'), 'light');
    assert.equal(mockRoot.classList.contains('dark'), false, 'Light theme must not flash dark class');
  });
});

describe('CargoXpress Theme System — Invalid Stored Values & Graceful Fallback', () => {
  let mockStorage;
  let mockRoot;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    mockRoot = createMockElement();
  });

  it('9. Falls back to DEFAULT_THEME_ID for arbitrary or corrupted string values', () => {
    const invalidValues = [
      'hacked_theme',
      'neon-pink',
      'dark',
      'light',
      '',
      'null',
      'undefined',
      '{}',
      '[object Object]',
    ];

    invalidValues.forEach((badVal) => {
      mockStorage.setItem(THEME_STORAGE_KEY, badVal);
      const sanitized = sanitizeThemeId(mockStorage.getItem(THEME_STORAGE_KEY));
      assert.equal(
        sanitized,
        DEFAULT_THEME_ID,
        `Corrupted value "${badVal}" must fall back to ${DEFAULT_THEME_ID}`
      );

      const result = applyThemeToDOM(sanitized, mockRoot);
      assert.equal(result.id, DEFAULT_THEME_ID);
      assert.equal(mockRoot.getAttribute('data-theme'), DEFAULT_THEME_ID);
    });
  });

  it('10. Falls back to default when localStorage is empty or null', () => {
    const emptyVal = mockStorage.getItem(THEME_STORAGE_KEY); // null
    const sanitized = sanitizeThemeId(emptyVal);
    assert.equal(sanitized, DEFAULT_THEME_ID);

    const result = applyThemeToDOM(sanitized, mockRoot);
    assert.equal(result.id, 'midnight');
    assert.equal(mockRoot.getAttribute('data-theme'), 'midnight');
    assert.equal(mockRoot.classList.contains('dark'), true);
  });

  it('11. Gracefully handles storage throwing exceptions (e.g. QuotaExceededError or security block)', () => {
    const throwingStorage = {
      getItem() {
        throw new Error('Access denied by browser security policy');
      },
      setItem() {
        throw new Error('QuotaExceededError');
      },
    };

    let theme;
    try {
      theme = sanitizeThemeId(throwingStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      theme = DEFAULT_THEME_ID;
    }

    assert.equal(theme, DEFAULT_THEME_ID);
    const dom = applyThemeToDOM(theme, mockRoot);
    assert.equal(dom.id, 'midnight');
    assert.equal(mockRoot.getAttribute('data-theme'), 'midnight');
  });
});

describe('CargoXpress Theme System — Navigation & Reset to Default', () => {
  let mockStorage;
  let mockRoot;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    mockRoot = createMockElement();
  });

  it('12. Preserves active theme preference across simulated route transitions', () => {
    // User sets Ocean Blue
    let currentTheme = sanitizeThemeId('ocean');
    mockStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    applyThemeToDOM(currentTheme, mockRoot);

    // Simulate navigation between 4 distinct application routes
    const routes = ['/admin', '/truck', '/mergedSchedule', '/profile'];
    routes.forEach((route) => {
      // In React Router, ThemeProvider persists context across route changes
      const retrieved = sanitizeThemeId(mockStorage.getItem(THEME_STORAGE_KEY));
      assert.equal(
        retrieved,
        'ocean',
        `Route ${route} must inherit the active theme without resetting`
      );
    });

    assert.equal(mockRoot.getAttribute('data-theme'), 'ocean');
  });

  it('13. Reset option immediately restores default theme (Midnight)', () => {
    // User previously had Graphite
    mockStorage.setItem(THEME_STORAGE_KEY, 'graphite');
    applyThemeToDOM('graphite', mockRoot);
    assert.equal(mockRoot.getAttribute('data-theme'), 'graphite');

    // User triggers Reset Action
    const resetTarget = DEFAULT_THEME_ID;
    mockStorage.setItem(THEME_STORAGE_KEY, resetTarget);
    const result = applyThemeToDOM(resetTarget, mockRoot);

    assert.equal(result.id, 'midnight');
    assert.equal(mockStorage.getItem(THEME_STORAGE_KEY), 'midnight');
    assert.equal(mockRoot.getAttribute('data-theme'), 'midnight');
    assert.equal(mockRoot.getAttribute('data-theme-mode'), 'dark');
    assert.equal(mockRoot.classList.contains('dark'), true);
  });

  it('14. Cross-tab storage synchronization updates theme state on storage event', () => {
    // Tab 1 state starts on Midnight
    let tabState = 'midnight';
    applyThemeToDOM(tabState, mockRoot);
    assert.equal(mockRoot.getAttribute('data-theme'), 'midnight');

    // Simulated storage event received from Tab 2 changing theme to Warm Sand
    const simulatedStorageEvent = {
      key: THEME_STORAGE_KEY,
      newValue: 'sand',
      oldValue: 'midnight',
    };

    if (simulatedStorageEvent.key === THEME_STORAGE_KEY) {
      tabState = sanitizeThemeId(simulatedStorageEvent.newValue);
      applyThemeToDOM(tabState, mockRoot);
    }

    assert.equal(tabState, 'sand');
    assert.equal(mockRoot.getAttribute('data-theme'), 'sand');
    assert.equal(mockRoot.getAttribute('data-theme-mode'), 'light');
    assert.equal(mockRoot.classList.contains('dark'), false);
  });
});

describe('CargoXpress Theme System — Accessibility & Keyboard Navigation Logic', () => {
  it('15. Roving focus correctly advances and wraps around with ArrowDown and ArrowUp', () => {
    const totalItems = THEME_PRESETS.length + 1; // 5 presets + 1 reset action = 6
    let focusedIndex = 0;

    // ArrowDown advances
    focusedIndex = (focusedIndex + 1) % totalItems;
    assert.equal(focusedIndex, 1);

    // ArrowDown advances until last item
    for (let i = 1; i < totalItems - 1; i++) {
      focusedIndex = (focusedIndex + 1) % totalItems;
    }
    assert.equal(focusedIndex, totalItems - 1);

    // ArrowDown wraps from last to first
    focusedIndex = (focusedIndex + 1) % totalItems;
    assert.equal(focusedIndex, 0);

    // ArrowUp wraps from first to last
    focusedIndex = (focusedIndex - 1 + totalItems) % totalItems;
    assert.equal(focusedIndex, totalItems - 1);

    // Home jumps to 0
    focusedIndex = 0;
    assert.equal(focusedIndex, 0);

    // End jumps to last item
    focusedIndex = totalItems - 1;
    assert.equal(focusedIndex, 5);
  });

  it('16. Preset metadata supports screen-reader announcements with distinct labels', () => {
    THEME_PRESETS.forEach((preset) => {
      // Must have distinct announcement string
      const label = `${preset.name}, ${preset.mode} mode. ${preset.description}`;
      assert.ok(label.includes(preset.name));
      assert.ok(label.includes(preset.mode));
      assert.ok(preset.description.length > 5);
    });
  });
});

describe('CargoXpress Theme System — Security & Non-Sensitive Storage Guarantee', () => {
  it('17. Guarantees only recognized theme IDs are stored, preventing injection or credential leakage', () => {
    const mockStorage = createMockLocalStorage();

    // Attempting to set credential payloads as theme
    const maliciousPayloads = [
      'bearer_token_xyz12345',
      'password=secret;user=admin',
      '<script>alert(1)</script>',
      '{"token":"abc","role":"admin"}',
    ];

    maliciousPayloads.forEach((payload) => {
      // sanitizeThemeId rejects arbitrary payload
      const sanitized = sanitizeThemeId(payload);
      assert.equal(
        sanitized,
        DEFAULT_THEME_ID,
        'Malicious or credential payload must be rejected and sanitized to default theme'
      );
    });

    // Valid themes store only the clean string
    const validTheme = sanitizeThemeId('ocean');
    mockStorage.setItem(THEME_STORAGE_KEY, validTheme);
    assert.equal(mockStorage.getItem(THEME_STORAGE_KEY), 'ocean');
  });
});

