import React from 'react';
import Breadcrumbs from './Breadcrumbs';

/**
 * CargoXpress PageHeader Component
 * Editorial typography, eyebrow with dash tick, responsive action placement.
 */
export const PageHeader = ({
  eyebrow,
  title,
  description,
  badge,
  breadcrumbs,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-4 pb-6 sm:pb-8 border-b border-border/80 ${className}`}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-1" />}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-1.5 max-w-3xl">
          {eyebrow && (
            <p className="cx-eyebrow text-signal-aqua mb-0.5">
              <span>{eyebrow}</span>
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-ink font-sans">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>

          {description && (
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mt-0.5">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
