import React from 'react';

/**
 * CargoXpress Structured Table Architecture
 * Editorial logistics table with hairline dividers and tabular numeric alignment.
 */
export const Table = ({ children, className = '', containerClassName = '', ...props }) => (
  <div className={`w-full overflow-x-auto rounded-lg border border-border bg-surface/70 shadow-sm ${containerClassName}`}>
    <table className={`w-full text-left text-xs sm:text-sm text-ink-secondary border-collapse ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ children, className = '', ...props }) => (
  <thead className={`border-b border-border/80 bg-surface-subtle/70 ${className}`} {...props}>
    {children}
  </thead>
);

export const TableHead = ({ children, className = '', align = 'left', ...props }) => {
  const alignments = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  return (
    <th
      scope="col"
      className={`px-4 py-3.5 text-[11px] font-mono uppercase tracking-wider text-ink-muted font-medium whitespace-nowrap ${alignments[align] || alignments.left} ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableBody = ({ children, className = '', ...props }) => (
  <tbody className={`divide-y divide-border/40 ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className = '', isSelected = false, hover = true, ...props }) => (
  <tr
    className={`transition-colors duration-150 ${
      hover ? 'hover:bg-white/[0.03]' : ''
    } ${isSelected ? 'bg-signal-aqua/5' : ''} ${className}`}
    {...props}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, className = '', align = 'left', isNumeric = false, ...props }) => {
  const alignments = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  return (
    <td
      className={`px-4 py-3.5 align-middle ${isNumeric ? 'font-mono tabular-nums' : ''} ${alignments[align] || alignments.left} ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};

export const TableToolbar = ({ children, className = '', ...props }) => (
  <div className={`p-4 border-b border-border/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-subtle/40 ${className}`} {...props}>
    {children}
  </div>
);

/**
 * CargoXpress High-Performance Logistics DataTable
 * Provides sorting, selection, tabular numeric alignment, loading skeletons, and pagination.
 */
export const DataTable = ({
  columns = [],
  data = [],
  keyField = '_id',
  isLoading = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filterSlot,
  actionsSlot,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search filters.',
  emptyIcon,
  pagination,
  onRowClick,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  initialSort = { key: null, direction: 'asc' },
  className = '',
}) => {
  const [sortConfig, setSortConfig] = React.useState(initialSort);

  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        if (prev.direction === 'asc') return { key: columnKey, direction: 'desc' };
        return { key: null, direction: 'asc' };
      }
      return { key: columnKey, direction: 'asc' };
    });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;
    const col = columns.find((c) => (c.accessorKey || c.id) === sortConfig.key);
    return [...data].sort((a, b) => {
      let aVal = col?.accessorFn ? col.accessorFn(a) : a[sortConfig.key];
      let bVal = col?.accessorFn ? col.accessorFn(b) : b[sortConfig.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') {
        const res = aVal.localeCompare(String(bVal));
        return sortConfig.direction === 'asc' ? res : -res;
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortConfig, columns]);

  const allSelected = sortedData.length > 0 && sortedData.every((row) => selectedIds.includes(row[keyField]));

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toolbar if search, filters, or actions are provided */}
      {(onSearchChange !== undefined || filterSlot || actionsSlot) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-surface-elevated/60 border border-border">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {onSearchChange !== undefined && (
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full px-3 py-1.5 bg-surface text-xs text-ink placeholder:text-ink-subtle rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-signal-aqua"
                />
              </div>
            )}
            {filterSlot}
          </div>
          {actionsSlot && <div className="flex items-center gap-2 shrink-0">{actionsSlot}</div>}
        </div>
      )}

      {/* Main Table or Loading Skeleton */}
      {isLoading ? (
        <div className="w-full p-4 rounded-lg border border-border bg-surface/70 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-full bg-white/[0.04] rounded-md animate-pulse" />
          ))}
        </div>
      ) : sortedData.length === 0 ? (
        <div className="p-8 text-center rounded-lg border border-border bg-surface/60 space-y-2">
          {emptyIcon && (
            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center mx-auto text-ink-subtle mb-3">
              {React.createElement(emptyIcon, { className: 'w-5 h-5' })}
            </div>
          )}
          <h4 className="text-sm font-semibold text-ink">{emptyTitle}</h4>
          <p className="text-xs text-ink-muted">{emptyDescription}</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-border bg-surface/80 shadow-sm">
          <table className="w-full text-left text-xs text-ink-secondary border-collapse">
            <thead className="border-b border-border/80 bg-surface-elevated/70">
              <tr>
                {onSelectRow && (
                  <th scope="col" className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => onSelectAll?.(e.target.checked)}
                      aria-label="Select all rows"
                      className="rounded border-border bg-surface-elevated text-signal-aqua focus:ring-signal-aqua cursor-pointer"
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const colKey = col.accessorKey || col.id;
                  const isSorted = sortConfig.key === colKey;
                  const align = col.align || (col.isNumeric ? 'right' : 'left');

                  return (
                    <th
                      key={col.id || col.accessorKey}
                      scope="col"
                      style={col.width ? { width: col.width } : undefined}
                      className={`px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-muted font-semibold whitespace-nowrap select-none ${
                        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                      } ${col.sortable ? 'cursor-pointer hover:text-ink' : ''} ${col.headerClassName || ''}`}
                      onClick={() => col.sortable && handleSort(colKey)}
                    >
                      <div className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-ink-subtle">
                            {isSorted ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {sortedData.map((row, rowIdx) => {
                const rowId = row[keyField] ?? rowIdx;
                const isSelected = selectedIds.includes(rowId);

                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick?.(row)}
                    className={`transition-colors duration-150 ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-signal-aqua/10 hover:bg-signal-aqua/15'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {onSelectRow && (
                      <td className="w-10 px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectRow(rowId, e.target.checked)}
                          aria-label={`Select row ${rowId}`}
                          className="rounded border-border bg-surface-elevated text-signal-aqua focus:ring-signal-aqua cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const align = col.align || (col.isNumeric ? 'right' : 'left');
                      const value = col.accessorFn ? col.accessorFn(row) : col.accessorKey ? row[col.accessorKey] : undefined;

                      return (
                        <td
                          key={col.id || col.accessorKey}
                          className={`px-4 py-3.5 align-middle ${
                            col.isNumeric ? 'font-mono tabular-nums text-ink' : ''
                          } ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                        >
                          {col.cell ? col.cell({ row, value, index: rowIdx }) : (value ?? '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-2 text-xs text-ink-subtle">
          <div>
            {pagination.totalItems !== undefined && (
              <span>Showing {sortedData.length} of {pagination.totalItems} records</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-ink disabled:opacity-30 hover:bg-white/5 transition-colors"
            >
              Previous
            </button>
            <span className="font-mono text-ink">
              {pagination.currentPage} / {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-ink disabled:opacity-30 hover:bg-white/5 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
