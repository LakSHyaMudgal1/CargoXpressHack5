import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * CargoXpress Select Component
 */
export const Select = React.forwardRef(({
  label,
  error,
  helperText,
  options = [],
  children,
  className = '',
  containerClassName = '',
  id,
  required = false,
  ...props
}, ref) => {
  const selectId = id || (label ? `cx-select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-mono uppercase tracking-wider text-ink-muted flex items-center justify-between select-none">
          <span>
            {label}
            {required && <span className="text-signal-coral ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`w-full appearance-none bg-surface-elevated/90 border rounded-md pl-3 pr-9 py-2 text-xs sm:text-sm text-ink transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 focus:ring-offset-1 focus:ring-offset-canvas focus:border-transparent cursor-pointer disabled:bg-surface-subtle/80 disabled:text-ink-muted disabled:border-border/60 disabled:cursor-not-allowed disabled:opacity-85 ${
            error
              ? 'border-signal-coral/60 focus:ring-signal-coral'
              : 'border-border hover:border-border-strong'
          } ${className}`}
          {...props}
        >
          {children || options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-surface-elevated text-ink"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 pointer-events-none text-ink-subtle">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error ? (
        <p className="text-xs text-signal-coral mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-ink-subtle mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
