import React from 'react';

/**
 * CargoXpress Card Architecture
 * Hairline borders, elevated dark surface, natural whitespace.
 */
export const Card = ({
  children,
  variant = 'default', // 'default' | 'elevated' | 'subtle'
  className = '',
  hoverable = false,
  ...props
}) => {
  const variants = {
    default: 'bg-surface/90 border border-border shadow-subtle-card',
    elevated: 'bg-surface-elevated border border-border-muted shadow-elevated-card',
    subtle: 'bg-surface-subtle/50 border border-border',
  };

  return (
    <div
      className={`${variants[variant] || variants.default} rounded-lg overflow-hidden transition-all duration-150 ${
        hoverable ? 'hover:border-border-strong hover:bg-surface-elevated/90' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`p-5 sm:p-6 border-b border-border/60 flex flex-col gap-1.5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', as: Component = 'h3', ...props }) => (
  <Component className={`text-base sm:text-lg font-semibold text-ink tracking-tight flex items-center justify-between gap-3 ${className}`} {...props}>
    {children}
  </Component>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`text-xs sm:text-sm text-ink-muted leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`p-5 sm:p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`p-5 sm:p-6 border-t border-border/60 bg-surface-subtle/50 flex items-center justify-between gap-3 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
