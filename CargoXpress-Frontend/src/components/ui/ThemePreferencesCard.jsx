import React from 'react';
import { Palette, Check, Sun, Moon, RotateCcw } from 'lucide-react';
import { useTheme } from '../../utils/themeContext';
import { useToast } from './ToastContext';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';

/**
 * CargoXpress ThemePreferencesCard
 * Visual theme selection card designed for Account Settings & Profile views.
 * Displays interactive palette previews, instant switching, and reset to default.
 */
export const ThemePreferencesCard = ({ className = '' }) => {
  const { theme, presets, setTheme, resetTheme, isDefault, defaultThemeId } = useTheme();
  const { showToast } = useToast();

  const handleSelect = (presetId, presetName) => {
    setTheme(presetId);
    showToast('info', 'Theme Updated', `Switched workspace theme to ${presetName}.`);
  };

  const handleReset = () => {
    resetTheme();
    showToast('success', 'Theme Reset', 'Workspace theme restored to default Midnight.');
  };

  return (
    <Card className={`p-6 space-y-6 ${className}`} id="appearance">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-signal-aqua shrink-0 shadow-sm">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Theme & Visual Preferences</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Select an enterprise palette. Changes apply immediately and persist in your browser.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isDefault && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={RotateCcw}
              onClick={handleReset}
              title="Reset theme to default Midnight"
            >
              Reset to Default
            </Button>
          )}
          {isDefault && (
            <Badge variant="neutral" size="sm" className="font-mono text-[10px] uppercase">
              Default Active
            </Badge>
          )}
        </div>
      </div>

      {/* Grid of Theme Presets */}
      <div
        role="radiogroup"
        aria-label="Workspace visual theme options"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
      >
        {presets.map((preset) => {
          const isSelected = preset.id === theme;
          const isPresetDefault = preset.id === defaultThemeId;

          return (
            <div
              key={preset.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => handleSelect(preset.id, preset.name)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handleSelect(preset.id, preset.name);
                }
              }}
              className={`relative p-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-signal-aqua ring-2 ring-signal-aqua/30 bg-surface-elevated shadow-md'
                  : 'border-border hover:border-border-strong bg-surface/80 hover:bg-surface-elevated'
              }`}
            >
              {/* Top Row: Palette Name & Badges */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-ink">
                      {preset.name}
                    </span>
                    {isPresetDefault && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-subtle text-ink-subtle uppercase border border-border/50">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-ink-muted block mt-0.5">
                    {preset.description}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {preset.mode === 'dark' ? (
                    <div className="p-1 rounded bg-surface-subtle text-ink-subtle" title="Dark mode">
                      <Moon className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className="p-1 rounded bg-surface-subtle text-ink-subtle" title="Light mode">
                      <Sun className="w-3 h-3" />
                    </div>
                  )}

                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-signal-aqua flex items-center justify-center text-canvas">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Palette Preview Simulation */}
              <div
                className="w-full h-16 rounded-lg p-2.5 flex flex-col justify-between border border-black/10 shadow-inner"
                style={{ backgroundColor: preset.swatch.bg }}
              >
                {/* Surface Card Preview */}
                <div
                  className="rounded px-2 py-1 flex items-center justify-between border shadow-2xs"
                  style={{
                    backgroundColor: preset.swatch.surface,
                    borderColor: preset.swatch.accent + '33',
                  }}
                >
                  <span
                    className="text-[10px] font-semibold tracking-tight"
                    style={{ color: preset.swatch.ink }}
                  >
                    CargoXpress
                  </span>

                  {/* Accent Pill */}
                  <span
                    className="text-[8px] font-mono px-1.5 py-0.2 rounded font-bold"
                    style={{
                      backgroundColor: preset.swatch.accent,
                      color: preset.mode === 'dark' ? '#07090E' : '#FFFFFF',
                    }}
                  >
                    Active
                  </span>
                </div>

                {/* Color Swatch Dots */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                    style={{ backgroundColor: preset.swatch.bg }}
                    title="Canvas"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                    style={{ backgroundColor: preset.swatch.surface }}
                    title="Surface"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                    style={{ backgroundColor: preset.swatch.accent }}
                    title="Accent"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                    style={{ backgroundColor: preset.swatch.ink }}
                    title="Typography"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Footnote */}
      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-ink-subtle">
        <span>Preferences persist locally across sessions and router navigations.</span>
        <span className="font-mono">Storage: localStorage (non-sensitive)</span>
      </div>
    </Card>
  );
};

export default ThemePreferencesCard;
