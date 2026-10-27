import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8 mb-4">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="p-1.5 rounded-md bg-surface-elevated border border-border text-ink-muted hover:text-ink hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-surface-elevated disabled:hover:text-ink-muted transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-ink-muted text-xs font-mono">
        Page <span className="text-ink font-semibold">{currentPage}</span> of <span className="text-ink font-semibold">{totalPages}</span>
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="p-1.5 rounded-md bg-surface-elevated border border-border text-ink-muted hover:text-ink hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-surface-elevated disabled:hover:text-ink-muted transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;
