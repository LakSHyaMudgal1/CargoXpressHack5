import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * CargoXpress Button Component
 * Inspired by CE Growth Partners restrained, purposeful interactive design.
 */
export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-aqua/80 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[0.98]';

  const variants = {
    // Primary: High-contrast Stark / Emerald operational action
    primary: 'bg-signal-emerald text-canvas hover:bg-emerald-400 font-semibold shadow-sm',
    // Aqua: Telemetry / Live optimization action
    aqua: 'bg-signal-aqua text-canvas hover:bg-teal-300 font-semibold shadow-sm',
    // Secondary: Dark elevated surface with hairline border
    secondary: 'bg-surface-elevated text-ink hover:bg-surface-hover border border-border hover:border-border-strong shadow-sm',
    // Outline: Transparent with hairline border
    outline: 'bg-transparent text-ink hover:bg-white/5 border border-border hover:border-border-strong',
    // Ghost: Zero border, clean text button
    ghost: 'bg-transparent text-ink-secondary hover:text-ink hover:bg-white/5',
    // Destructive: Hairline Coral signal
    destructive: 'bg-signal-coral/10 text-signal-coral border border-signal-coral/30 hover:bg-signal-coral hover:text-white',
    // Destructive Solid: High-urgency confirmation
    destructiveSolid: 'bg-signal-coral text-white hover:bg-red-600 shadow-sm font-semibold',
    // Link button
    link: 'bg-transparent text-signal-aqua hover:underline underline-offset-4 p-0 h-auto font-normal',
  };

  const sizes = {
    xs: 'text-[11px] px-2 py-0.75 rounded gap-1 min-h-[26px]',
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5 min-h-[32px]',
    md: 'text-xs sm:text-sm px-3.5 py-1.75 rounded-md gap-2 min-h-[38px]',
    lg: 'text-sm sm:text-base px-4.5 py-2.25 rounded-lg gap-2 min-h-[44px]',
    icon: 'p-1.5 rounded-md aspect-square min-h-[34px] min-w-[34px]',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {LeftIcon && <LeftIcon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
          {RightIcon && <RightIcon className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
