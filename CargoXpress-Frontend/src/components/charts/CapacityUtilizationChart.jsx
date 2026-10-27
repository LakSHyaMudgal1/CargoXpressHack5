import React, { useState } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { Truck, Info } from 'lucide-react';

/**
 * CapacityUtilizationChart
 * Renders real capacity utilization per vehicle or route schedule.
 *
 * @param {Array} items - [{ id, label, subLabel, peakLoad, totalCapacity, utilizationPct, status }]
 * @param {string} title - Chart title
 * @param {string} subtitle - Explanatory subtitle
 * @param {string} emptyText - Message when no data exists
 */
const CapacityUtilizationChart = ({
  items = [],
  title = "Fleet Capacity Utilization",
  subtitle = "Peak cargo load relative to rated vehicle payload capacity",
  emptyText = "No active schedules or truck load data available."
}) => {
  const [hoveredItem, setHoveredItem] = useState(null);

  if (!items || items.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          <Badge variant="neutral" size="sm">No Data</Badge>
        </div>
        <div className="py-8 text-center text-xs text-ink-subtle">
          {emptyText}
        </div>
      </Card>
    );
  }

  // Calculate average utilization
  const totalCap = items.reduce((sum, it) => sum + (it.totalCapacity || 0), 0);
  const totalLoad = items.reduce((sum, it) => sum + (it.peakLoad || 0), 0);
  const avgPct = totalCap > 0 ? Math.round((totalLoad / totalCap) * 100) : 0;

  const getBarColor = (pct) => {
    if (pct > 90) return 'bg-signal-coral';
    if (pct >= 65) return 'bg-signal-emerald';
    if (pct >= 35) return 'bg-signal-aqua';
    return 'bg-signal-amber';
  };

  const getBadgeVariant = (pct) => {
    if (pct > 90) return 'coral';
    if (pct >= 65) return 'emerald';
    if (pct >= 35) return 'aqua';
    return 'amber';
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
            <Badge variant="aqua" size="sm">{items.length} Tracked</Badge>
          </div>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-ink-subtle block">Fleet Average</span>
            <span className="font-mono text-sm font-semibold text-ink">{avgPct}% Used</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-signal-aqua">
            <Truck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Chart List */}
      <div className="space-y-4">
        {items.slice(0, 6).map((item, idx) => {
          const pct = Math.min(100, Math.max(0, item.utilizationPct ?? 0));
          const isHovered = hoveredItem === (item.id || idx);

          return (
            <div
              key={item.id || idx}
              onMouseEnter={() => setHoveredItem(item.id || idx)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`p-3 rounded-xl border transition-all duration-150 ${
                isHovered
                  ? 'bg-surface-elevated border-border-hover shadow-sm'
                  : 'bg-surface/50 border-border/60 hover:border-border'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-semibold text-ink truncate">
                    {item.label}
                  </span>
                  {item.subLabel && (
                    <span className="text-ink-subtle truncate text-[11px]">
                      • {item.subLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[11px] text-ink-muted">
                    {item.peakLoad?.toLocaleString()} / {item.totalCapacity?.toLocaleString()} kg
                  </span>
                  <Badge variant={getBadgeVariant(pct)} size="sm">
                    {pct}%
                  </Badge>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Hover Details Row */}
              {isHovered && (
                <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-ink-subtle animate-in fade-in duration-150">
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-signal-aqua" />
                    Remaining Headroom: <strong className="text-ink font-mono font-normal">{Math.max(0, (item.totalCapacity || 0) - (item.peakLoad || 0)).toLocaleString()} kg</strong>
                  </span>
                  {item.status && (
                    <span className="capitalize">{item.status.replace(/_/g, ' ')}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {items.length > 6 && (
        <p className="text-[11px] text-ink-subtle text-center mt-4">
          Showing top 6 of {items.length} active routes/vehicles
        </p>
      )}
    </Card>
  );
};

export default CapacityUtilizationChart;
