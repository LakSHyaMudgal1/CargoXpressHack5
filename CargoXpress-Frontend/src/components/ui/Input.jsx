import React from 'react';

/**
 * CargoXpress Input Component
 * Accessible input with label, helper text, error indicator, and left/right icon slots.
 */
export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  containerClassName = '',
  id,
  type = 'text',
  required = false,
  ...props
}, ref) => {
  const inputId = id || (label ? `cx-input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const helperId = helperText && inputId ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-mono uppercase tracking-wider text-ink-muted flex items-center justify-between select-none"
        >
          <span>
            {label}
            {required && <span className="text-signal-coral ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {LeftIcon && (
          <div className="absolute left-3 pointer-events-none text-ink-subtle">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full bg-surface-elevated/90 border rounded-md px-3 py-2 text-xs sm:text-sm text-ink placeholder:text-ink-subtle transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 focus:ring-offset-1 focus:ring-offset-canvas focus:border-transparent disabled:bg-surface-subtle/80 disabled:text-ink-muted disabled:border-border/60 disabled:cursor-not-allowed disabled:opacity-85 ${
            LeftIcon ? 'pl-9' : ''
          } ${RightIcon ? 'pr-9' : ''} ${
            error
              ? 'border-signal-coral/60 focus:ring-signal-coral'
              : 'border-border hover:border-border-strong'
          } ${className}`}
          {...props}
        />

        {RightIcon && (
          <div className="absolute right-3 pointer-events-none text-ink-subtle">
            <RightIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-[11px] text-signal-coral font-mono mt-0.5">{error}</p>
      ) : helperText ? (
        <p id={helperId} className="text-[11px] text-ink-subtle mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
