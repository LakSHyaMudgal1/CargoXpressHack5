import React, { useState, useRef, useEffect } from 'react';

/**
 * CargoXpress Accessible Tooltip Component
 * Provides purposeful hover & keyboard focus feedback for operational metrics.
 * Respects prefers-reduced-motion and screen-reader accessibility.
 */
export const Tooltip = ({
  content,
  children,
  placement = 'top',
  delay = 200,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);
  const tooltipId = useRef(`cx-tooltip-${Math.random().toString(36).substring(2, 8)}`);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const placementStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  if (!content) return children;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      <div
        aria-describedby={isVisible ? tooltipId.current : undefined}
        tabIndex={0}
        className="inline-flex items-center focus:outline-none"
      >
        {children}
      </div>

      {isVisible && (
        <div
          id={tooltipId.current}
          role="tooltip"
          className={`absolute z-50 px-2.5 py-1.5 text-[11px] font-mono leading-snug text-ink bg-surface-elevated/95 border border-border-strong rounded-md shadow-elevated-card whitespace-nowrap pointer-events-none transition-all duration-150 motion-reduce:transition-none ${placementStyles[placement] || placementStyles.top} ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;

