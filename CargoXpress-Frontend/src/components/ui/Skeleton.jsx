import React from 'react';

/**
 * CargoXpress Skeleton Loading Component
 */
export const Skeleton = ({
  className = '',
  variant = 'rectangular', // 'text' | 'circular' | 'rectangular'
  ...props
}) => {
  const variants = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded-lg w-full',
  };

  return (
    <div
      className={`animate-pulse bg-surface-subtle ${variants[variant] || variants.rectangular} ${className}`}
      {...props}
    />
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4, className = '' }) => (
  <div className={`w-full overflow-hidden rounded-xl border border-border bg-surface/70 ${className}`}>
    <div className="p-4 border-b border-border/80 flex items-center justify-between gap-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-9 w-28" />
    </div>
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2 border-b border-border/40 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={`h-5 ${j === 0 ? 'w-32' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const CardSkeleton = ({ className = '' }) => (
  <div className={`p-6 rounded-xl border border-border bg-surface/80 flex flex-col gap-4 ${className}`}>
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="h-8 w-40" />
    <Skeleton className="h-4 w-32" />
  </div>
);

export default Skeleton;
