import React, { useState, useRef, useEffect } from 'react';

/**
 * CargoXpress Dropdown Component
 * Click outside detection, keyboard accessible, robust positioning.
 */
export const Dropdown = ({
  trigger,
  children,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const alignments = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
    center: 'left-1/2 -translate-x-1/2 origin-top',
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setIsOpen((prev) => !prev)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 w-56 rounded-lg bg-surface-elevated border border-border-strong shadow-elevated-card py-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${
            alignments[align] || alignments.right
          } ${className}`}
          role="menu"
        >
          {typeof children === 'function' ? children({ close: () => setIsOpen(false) }) : children}
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({
  children,
  icon: Icon,
  onClick,
  destructive = false,
  className = '',
  as: Component = 'button',
  ...props
}) => {
  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-colors select-none ${
        destructive
          ? 'text-signal-coral hover:bg-signal-coral/10'
          : 'text-ink-secondary hover:text-ink hover:bg-white/5'
      } ${className}`}
      role="menuitem"
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span>{children}</span>
    </Component>
  );
};

export const DropdownSeparator = () => (
  <div className="my-1 border-t border-border/60" role="separator" />
);

export default Dropdown;
