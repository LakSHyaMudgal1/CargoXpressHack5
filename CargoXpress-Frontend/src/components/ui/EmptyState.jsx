import React from 'react';
import { PackageOpen } from 'lucide-react';
import Button from './Button';

/**
 * CargoXpress EmptyState Component
 * Purposeful, non-distracting empty state with clean icon and call-to-action.
 */
export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'No records found',
  description = 'There are currently no items matching your criteria in this view.',
  actionLabel,
  onAction,
  secondaryAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 sm:p-10 border border-dashed border-border rounded-lg bg-surface-subtle/30 ${className}`}>
      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-ink-muted mb-3 shadow-sm">
        <Icon className="w-5 h-5 stroke-[1.5]" />
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-ink tracking-tight mb-1.5">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-ink-muted max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {(actionLabel || secondaryAction) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {actionLabel && onAction && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
