import React from 'react';

/**
 * CargoXpress Status Badge Component
 * Uniform semantic status indicator across dispatch, trucks, and trader shipments.
 */
export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  pill = false,
  className = '',
  ...props
}) => {
  const variants = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    aqua: 'bg-signal-aqua/10 text-signal-aqua border-signal-aqua/30',
    coral: 'bg-signal-coral/10 text-signal-coral border-signal-coral/30',
    destructive: 'bg-signal-coral/10 text-signal-coral border-signal-coral/30',
    amber: 'bg-signal-amber/10 text-signal-amber border-signal-amber/30',
    warning: 'bg-signal-amber/10 text-signal-amber border-signal-amber/30',
    sky: 'bg-signal-sky/10 text-signal-sky border-signal-sky/30',
    info: 'bg-signal-sky/10 text-signal-sky border-signal-sky/30',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    neutral: 'bg-white/5 text-ink-secondary border-border',
  };

  const dotColors = {
    emerald: 'bg-emerald-400',
    success: 'bg-emerald-400',
    aqua: 'bg-signal-aqua',
    coral: 'bg-signal-coral',
    destructive: 'bg-signal-coral',
    amber: 'bg-signal-amber',
    warning: 'bg-signal-amber',
    sky: 'bg-signal-sky',
    info: 'bg-signal-sky',
    purple: 'bg-purple-400',
    neutral: 'bg-ink-subtle',
  };

  const sizes = {
    sm: 'text-[10.5px] px-2 py-0.5 gap-1.5 font-mono tracking-wide uppercase',
    md: 'text-[11.5px] px-2.5 py-0.75 gap-1.5 font-mono tracking-wide uppercase',
    lg: 'text-xs px-3 py-1 gap-2 font-mono tracking-wide uppercase',
  };

  return (
    <span
      className={`inline-flex items-center font-medium border whitespace-nowrap select-none ${
        pill ? 'rounded-full' : 'rounded-md'
      } ${variants[variant] || variants.neutral} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant] || dotColors.neutral}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColors[variant] || dotColors.neutral}`} />
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
