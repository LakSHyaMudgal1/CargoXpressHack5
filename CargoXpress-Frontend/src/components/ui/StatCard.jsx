import React from 'react';

/**
 * CargoXpress StatCard / MetricCard Component
 * High-impact operational metric tile with tabular figures and restrained borders.
 */
export const StatCard = ({
  label,
  value,
  unit,
  change,
  changeType = 'neutral', // 'positive' | 'negative' | 'warning' | 'neutral'
  icon: Icon,
  subtitle,
  className = '',
  onClick,
}) => {
  const isClickable = Boolean(onClick);

  const changeColors = {
    positive: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
    negative: 'text-signal-coral bg-signal-coral/10 border-signal-coral/25',
    warning: 'text-signal-amber bg-signal-amber/10 border-signal-amber/25',
    neutral: 'text-ink-muted bg-white/5 border-border',
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 bg-surface/90 border border-border rounded-lg transition-all duration-150 ${
        isClickable ? 'cursor-pointer hover:border-border-strong hover:bg-surface-elevated/80' : ''
      } ${className}`}
    >
      <div className="flex flex-col gap-2.5">
        {/* Eyebrow Label & Optional Icon */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-medium select-none">
            {label}
          </span>
          {Icon && (
            <div className="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center text-signal-aqua shrink-0">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Big Number Display */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-2xl sm:text-3xl font-semibold font-mono tracking-tight text-ink tabular-nums cx-num">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-mono text-ink-subtle">
              {unit}
            </span>
          )}
        </div>

        {/* Subtitle / Delta indicator */}
        {(change || subtitle) && (
          <div className="flex items-center gap-2 text-xs text-ink-subtle flex-wrap pt-0.5">
            {change && (
              <span
                className={`font-mono text-[10.5px] px-1.5 py-0.5 rounded border select-none ${
                  changeColors[changeType] || changeColors.neutral
                }`}
              >
                {change}
              </span>
            )}
            {subtitle && <span className="truncate text-[11px] text-ink-subtle">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
