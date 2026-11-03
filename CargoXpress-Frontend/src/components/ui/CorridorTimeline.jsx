import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';

/**
 * CorridorTimeline Component
 * High-density industrial route visualization displaying sequence of corridor stops,
 * inter-city transit segments, and live capacity utilization gauges.
 *
 * @param {Array<string>} stops - Array of city or checkpoint names
 * @param {Array<number>} currentLoad - Array of payload weights (kg) for each segment
 * @param {number} totalCapacity - Vehicle rated capacity (kg)
 * @param {string} source - Origin city (defaults to stops[0])
 * @param {string} destination - Destination city (defaults to stops[last])
 * @param {boolean} compact - Compact variant for dense tables
 * @param {string} className - Optional container styling
 */
export const CorridorTimeline = ({
  stops = [],
  currentLoad = [],
  totalCapacity = 10000,
  source,
  destination,
  compact = false,
  className = '',
}) => {
  // Build a normalized sequence of stops
  const allStops = React.useMemo(() => {
    if (stops && stops.length > 0) return stops;
    const list = [];
    if (source) list.push(source);
    if (destination && destination !== source) list.push(destination);
    return list.length > 0 ? list : ['Origin', 'Destination'];
  }, [stops, source, destination]);

  const segmentsCount = Math.max(0, allStops.length - 1);

  const getSegmentMetrics = (idx) => {
    const load = Array.isArray(currentLoad) ? (currentLoad[idx] ?? 0) : 0;
    const cap = totalCapacity > 0 ? totalCapacity : 10000;
    const pct = Math.min(100, Math.round((load / cap) * 100));

    let barColor = 'bg-signal-aqua';
    let textColor = 'text-signal-aqua';
    let statusLabel = 'Active';

    if (pct > 90) {
      barColor = 'bg-signal-coral';
      textColor = 'text-signal-coral';
      statusLabel = 'Near Full';
    } else if (pct >= 65) {
      barColor = 'bg-signal-emerald';
      textColor = 'text-signal-emerald';
      statusLabel = 'Optimal';
    } else if (pct >= 35) {
      barColor = 'bg-signal-aqua';
      textColor = 'text-signal-aqua';
      statusLabel = 'Standard';
    } else {
      barColor = 'bg-signal-amber';
      textColor = 'text-signal-amber';
      statusLabel = 'Headroom';
    }

    return { load, cap, pct, barColor, textColor, statusLabel };
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 flex-wrap font-mono text-xs ${className}`}>
        {allStops.map((stop, idx) => (
          <React.Fragment key={idx}>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-elevated/80 border border-border text-ink text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-aqua/80 shrink-0" />
              <span className="truncate max-w-[90px]">{stop}</span>
            </span>

            {idx < allStops.length - 1 && (
              <span className="text-ink-subtle text-[10px] flex items-center">
                <ArrowRight className="w-3 h-3 text-ink-subtle/60" />
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Route Path Graphic */}
      <div className="relative flex items-center justify-between w-full overflow-x-auto py-2 px-1">
        {allStops.map((stop, idx) => {
          const isOrigin = idx === 0;
          const isDestination = idx === allStops.length - 1;
          const metrics = idx < segmentsCount ? getSegmentMetrics(idx) : null;

          return (
            <React.Fragment key={idx}>
              {/* Stop Node */}
              <div className="flex flex-col items-center shrink-0 z-10 group cursor-default">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isOrigin
                      ? 'border-signal-aqua bg-surface text-signal-aqua shadow-sm'
                      : isDestination
                      ? 'border-signal-emerald bg-surface text-signal-emerald shadow-sm'
                      : 'border-border-strong bg-surface-elevated text-ink-muted'
                  }`}
                  title={`${stop} (${isOrigin ? 'Origin' : isDestination ? 'Destination' : `Stop #${idx}`})`}
                >
                  <MapPin className="w-3 h-3" />
                </div>

                <span className="mt-1.5 text-[11px] font-semibold text-ink text-center max-w-[85px] truncate">
                  {stop}
                </span>

                <span className="text-[10px] font-mono text-ink-subtle uppercase tracking-wider">
                  {isOrigin ? 'Origin' : isDestination ? 'Dest' : `Leg ${idx}`}
                </span>
              </div>

              {/* Transit Segment Bar Between Consecutive Stops */}
              {idx < allStops.length - 1 && metrics && (
                <div className="flex-1 mx-2 min-w-[70px] max-w-[160px] flex flex-col items-center">
                  {/* Metric Readout Above Segment */}
                  <div className="flex items-center justify-between w-full text-[10px] font-mono mb-1 px-0.5">
                    <span className="text-ink-subtle">
                      {metrics.load.toLocaleString()} kg
                    </span>
                    <span className={`font-semibold ${metrics.textColor}`}>
                      {metrics.pct}%
                    </span>
                  </div>

                  {/* Visual Payload Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-surface-hover/80 overflow-hidden border border-border/40">
                    <div
                      className={`h-full ${metrics.barColor} transition-all duration-300 rounded-full`}
                      style={{ width: `${metrics.pct}%` }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default CorridorTimeline;
