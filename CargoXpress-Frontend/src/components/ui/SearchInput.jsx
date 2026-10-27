import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * CargoXpress SearchInput Component
 * Instant clear button, search icon, restrained styling.
 */
export const SearchInput = React.forwardRef(({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search fleet, routes, or consignments...',
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={`relative flex items-center w-full ${containerClassName}`}>
      <div className="absolute left-3.5 pointer-events-none text-ink-subtle">
        <Search className="w-4 h-4" />
      </div>

      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-surface-elevated/80 border border-border rounded-md pl-9 pr-9 py-2 text-xs sm:text-sm text-ink placeholder:text-ink-subtle transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 focus:ring-offset-1 focus:ring-offset-canvas focus:border-transparent ${className}`}
        {...props}
      />

      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-3 p-0.5 rounded text-ink-subtle hover:text-ink hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
export default SearchInput;
