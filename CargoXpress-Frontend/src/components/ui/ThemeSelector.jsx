import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Palette, Check, Sun, Moon, RotateCcw } from 'lucide-react';
import { useTheme } from '../../utils/themeContext';

/**
 * CargoXpress Accessible Theme Selector
 * Full keyboard navigation (Arrow Up/Down, Home, End, Escape, Enter, Space),
 * screen-reader compliant ARIA menu/menuitemradio roles, rich swatch previews,
 * and clear default indicator with instant reset.
 */
export const ThemeSelector = ({ align = 'right', className = '' }) => {
  const { theme, currentTheme, presets, setTheme, resetTheme, isDefault, defaultThemeId } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  // Sync itemRefs length
  itemRefs.current = itemRefs.current.slice(0, presets.length + 1);

  // When opening, focus currently active preset
  const openMenu = useCallback(() => {
    const activeIdx = presets.findIndex((p) => p.id === theme);
    setFocusedIndex(activeIdx >= 0 ? activeIdx : 0);
    setIsOpen(true);
  }, [presets, theme]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
    triggerRef.current?.focus();
  }, []);

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Focus the active item element when focusedIndex changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Handle keyboard events on the menu
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    const totalItems = presets.length + 1; // Presets + Reset option

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(totalItems - 1);
        break;
      case 'Escape':
      case 'Tab':
        e.preventDefault();
        closeMenu();
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={`relative inline-block text-left ${className}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id="cx-theme-selector-trigger"
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="cx-theme-selector-menu"
        aria-label={`Visual theme selector: active theme ${currentTheme.name} (${currentTheme.mode})`}
        className="flex items-center gap-2 p-1.5 px-2.5 rounded-lg border border-border hover:border-border-strong bg-surface-elevated/70 hover:bg-surface-elevated text-xs font-medium text-ink transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-aqua"
        title={`Change theme (Current: ${currentTheme.name})`}
      >
        {/* Active swatch preview */}
        <span
          className="w-3 h-3 rounded-full border border-border shrink-0 shadow-sm"
          style={{ backgroundColor: currentTheme.swatch.accent }}
          aria-hidden="true"
        />

        <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          {currentTheme.name}
        </span>

        <Palette className="w-3.5 h-3.5 text-ink-subtle shrink-0" aria-hidden="true" />
      </button>

      {/* Flyout Menu */}
      {isOpen && (
        <div
          id="cx-theme-selector-menu"
          ref={menuRef}
          role="menu"
          aria-labelledby="cx-theme-selector-trigger"
          aria-orientation="vertical"
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-72 rounded-xl bg-surface-elevated border border-border-strong shadow-elevated-card py-2 z-50 animate-in fade-in zoom-in-95 duration-100 focus:outline-none`}
        >
          {/* Header */}
          <div className="px-3.5 py-1.5 border-b border-border/60 mb-1 flex items-center justify-between select-none">
            <span className="text-[10px] font-mono uppercase tracking-widest text-ink-subtle font-semibold">
              Theme Presets
            </span>
            <span className="text-[10px] font-mono text-ink-subtle">
              Default: Midnight
            </span>
          </div>

          {/* Theme Option Items */}
          <div className="space-y-0.5 px-1">
            {presets.map((preset, index) => {
              const isSelected = preset.id === theme;
              const isDefaultPreset = preset.id === defaultThemeId;

              return (
                <button
                  key={preset.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  tabIndex={focusedIndex === index ? 0 : -1}
                  onClick={() => {
                    setTheme(preset.id);
                    closeMenu();
                  }}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors focus:outline-none ${
                    isSelected
                      ? 'bg-signal-aqua/10 text-signal-aqua font-semibold'
                      : focusedIndex === index
                      ? 'bg-surface-hover text-ink'
                      : 'text-ink-secondary hover:text-ink hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Quad-color Swatch Preview */}
                    <div
                      className="flex items-center -space-x-1 shrink-0 p-0.5 rounded-full border border-border bg-surface shadow-xs"
                      aria-hidden="true"
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-border/60 shadow-2xs"
                        style={{ backgroundColor: preset.swatch.bg }}
                        title="Canvas background"
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-border/60 shadow-2xs"
                        style={{ backgroundColor: preset.swatch.surface }}
                        title="Card surface"
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-border/60 shadow-2xs"
                        style={{ backgroundColor: preset.swatch.accent }}
                        title="Accent action"
                      />
                    </div>

                    <div className="min-w-0 leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold block truncate">
                          {preset.name}
                        </span>
                        {isDefaultPreset && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-subtle text-ink-subtle uppercase border border-border/50">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-ink-muted block truncate font-normal mt-0.5">
                        {preset.mode === 'dark' ? 'Dark Mode' : 'Light Mode'} • {preset.description}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {preset.mode === 'dark' ? (
                      <Moon className="w-3 h-3 text-ink-subtle" aria-hidden="true" />
                    ) : (
                      <Sun className="w-3 h-3 text-ink-subtle" aria-hidden="true" />
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-signal-aqua shrink-0" aria-label="Active selection" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Reset to Default Action Option */}
          <div className="mt-1 pt-1 border-t border-border/60 px-1">
            <button
              ref={(el) => {
                itemRefs.current[presets.length] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={focusedIndex === presets.length ? 0 : -1}
              onClick={() => {
                resetTheme();
                closeMenu();
              }}
              onMouseEnter={() => setFocusedIndex(presets.length)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs transition-colors focus:outline-none ${
                isDefault
                  ? 'text-ink-subtle opacity-70 hover:opacity-100 hover:bg-surface-hover'
                  : 'text-signal-aqua hover:bg-signal-aqua/10 font-medium'
              } ${focusedIndex === presets.length ? 'bg-surface-hover text-ink' : ''}`}
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Reset to Default (Midnight)</span>
              </div>
              {isDefault && (
                <span className="text-[10px] font-mono text-ink-subtle">
                  Active
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
