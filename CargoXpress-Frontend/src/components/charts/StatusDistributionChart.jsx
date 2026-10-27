import React, { useState } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

/**
 * StatusDistributionChart
 * Displays an SVG donut chart representing status breakdowns with interactive segments.
 *
 * @param {Array} segments - [{ label, count, color, badgeVariant }]
 * @param {string} title - Chart title
 * @param {string} subtitle - Explanatory subtitle
 * @param {string} centerLabel - Center text label
 * @param {string} emptyText - Message when all counts are 0
 */
const StatusDistributionChart = ({
  segments = [],
  title = "Status Distribution",
  subtitle = "Breakdown of operational states",
  centerLabel = "Total",
  emptyText = "No operational events to display."
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const total = segments.reduce((sum, s) => sum + (s.count || 0), 0);

  if (!segments || segments.length === 0 || total === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          <Badge variant="neutral" size="sm">0 Records</Badge>
        </div>
        <div className="py-10 text-center text-xs text-ink-subtle">
          {emptyText}
        </div>
      </Card>
    );
  }

  // Calculate SVG stroke dashes for donut chart
  // Radius = 40, Circumference = 2 * PI * 40 = 251.327
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const chartSegments = segments
    .filter(s => (s.count || 0) > 0)
    .map((s, idx) => {
      const pct = (s.count / total) * 100;
      const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
      accumulatedPercent += pct;
      return {
        ...s,
        pct: Math.round(pct),
        strokeDasharray,
        strokeDashoffset,
        idx
      };
    });

  const activeSegment = hoveredIdx !== null ? chartSegments.find(s => s.idx === hoveredIdx) : null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        <Badge variant="aqua" size="sm">{total} Total</Badge>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="10"
            />
            {/* Segment arcs */}
            {chartSegments.map((s) => (
              <circle
                key={s.label}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={s.color || '#19E8C8'}
                strokeWidth={hoveredIdx === s.idx ? "12" : "10"}
                strokeDasharray={s.strokeDasharray}
                strokeDashoffset={s.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(s.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>

          {/* Center readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="font-mono text-xl font-bold text-ink tracking-tight">
              {activeSegment ? activeSegment.count : total}
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-ink-subtle">
              {activeSegment ? `${activeSegment.pct}%` : centerLabel}
            </span>
          </div>
        </div>

        {/* Legend list */}
        <div className="flex-1 w-full space-y-2">
          {segments.map((seg, idx) => {
            const isHovered = hoveredIdx === idx;
            const pct = total > 0 ? Math.round(((seg.count || 0) / total) * 100) : 0;

            return (
              <div
                key={seg.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  isHovered ? 'bg-surface-elevated' : 'hover:bg-surface-elevated/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color || '#19E8C8' }}
                  />
                  <span className={`font-medium ${isHovered ? 'text-ink' : 'text-ink-muted'}`}>
                    {seg.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-ink font-semibold">{seg.count || 0}</span>
                  <span className="text-ink-subtle text-[11px] w-8 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default StatusDistributionChart;
