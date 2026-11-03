import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Truck,
  Layers,
  Sparkles,
  GitMerge,
  Split,
  CheckCircle2,
  Play,
  RotateCcw
} from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";

/**
 * RouteSchematicVisualizer
 * Flagship interactive route schematic displaying carrier, absorbed, and consolidated itineraries.
 * Features controlled route-merging motion, corridor simulation, and confirmed itinerary transitions.
 * Fully respects prefers-reduced-motion and preserves underlying route logic.
 */
export const RouteSchematicVisualizer = ({
  carrierPlate = "Carrier",
  absorbedPlate = "Incoming",
  carrierStops = [],
  absorbedStops = [],
  allStops = [],
  segmentLoads = [],
  activeStop = null,
  onSelectStop = () => {},
  totalCapacity = 0,
  isConfirmed = false,
}) => {
  const [viewMode, setViewMode] = useState(isConfirmed ? "confirmed" : "merging");
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (isConfirmed) {
      setViewMode("confirmed");
      setIsSimulating(false);
    }
  }, [isConfirmed]);

  const sharedStops = absorbedStops.filter((s) => carrierStops.includes(s));
  const additionalStops = absorbedStops.filter((s) => !carrierStops.includes(s));

  // Determine node type in unified sequence
  const getNodeType = (stop) => {
    const isShared = sharedStops.includes(stop);
    const isAdditional = additionalStops.includes(stop);
    const isCarrierOrigin = stop === carrierStops[0];
    const isCarrierDest = stop === carrierStops[carrierStops.length - 1];
    const isAbsorbedOrigin = stop === absorbedStops[0];
    const isAbsorbedDest = stop === absorbedStops[absorbedStops.length - 1];

    if (isShared) return "shared";
    if (isAdditional) return "additional";
    if (isCarrierOrigin || isCarrierDest) return "carrier-endpoint";
    if (isAbsorbedOrigin || isAbsorbedDest) return "absorbed-endpoint";
    return "carrier-waypoint";
  };

  const handleSimulateAlignment = () => {
    setIsSimulating(true);
    setViewMode("split");

    setTimeout(() => {
      setViewMode("merging");
    }, 600);

    setTimeout(() => {
      setViewMode("consolidated");
      setIsSimulating(false);
    }, 1800);
  };

  return (
    <div className="rounded-xl border border-border/80 bg-surface/80 p-5 space-y-6 transition-all duration-300">
      {/* 1. Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-signal-aqua font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Algorithmic Corridor Alignment
            </span>
            <Badge variant={isConfirmed ? "emerald" : "aqua"} size="sm">
              {allStops.length} Unified Stops
            </Badge>
            {isConfirmed && (
              <Badge variant="emerald" size="sm" className="animate-cx-pop">
                Confirmed & Dispatched
              </Badge>
            )}
          </div>
          <h3 className="text-sm font-bold text-ink mt-0.5">
            Interactive Multi-Stop Route Schematic
          </h3>
        </div>

        {/* View Mode Switcher / Simulation Action */}
        <div className="flex items-center gap-2">
          {!isConfirmed && (
            <Button
              variant="secondary"
              size="xs"
              onClick={handleSimulateAlignment}
              disabled={isSimulating}
              leftIcon={isSimulating ? RotateCcw : Play}
              className="text-signal-aqua hover:bg-signal-aqua/10"
            >
              {isSimulating ? "Aligning..." : "Simulate Alignment"}
            </Button>
          )}

          <div className="inline-flex items-center rounded-lg bg-surface-elevated p-0.5 border border-border text-xs font-mono">
            <button
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded-md transition-all duration-150 flex items-center gap-1.5 ${
                viewMode === "split"
                  ? "bg-surface-hover text-ink font-semibold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Split className="w-3 h-3" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode("merging")}
              className={`px-2.5 py-1 rounded-md transition-all duration-150 flex items-center gap-1.5 ${
                viewMode === "merging"
                  ? "bg-signal-aqua/20 text-signal-aqua font-semibold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <GitMerge className="w-3 h-3" />
              <span>Converge</span>
            </button>
            <button
              onClick={() => setViewMode(isConfirmed ? "confirmed" : "consolidated")}
              className={`px-2.5 py-1 rounded-md transition-all duration-150 flex items-center gap-1.5 ${
                viewMode === "consolidated" || viewMode === "confirmed"
                  ? isConfirmed
                    ? "bg-signal-emerald/20 text-signal-emerald font-semibold shadow-sm"
                    : "bg-signal-aqua/20 text-signal-aqua font-semibold shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{isConfirmed ? "Confirmed" : "Consolidated"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notice Banner for Uncommitted Simulation */}
      {!isConfirmed && viewMode === "merging" && (
        <div className="px-3.5 py-2 rounded-lg bg-signal-aqua/10 border border-signal-aqua/30 flex items-center justify-between text-xs font-mono text-signal-aqua">
          <span className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 shrink-0 animate-pulse" />
            <span>Simulating candidate route alignment — proposal requires dispatcher authorization to commit.</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Candidate Preview</span>
        </div>
      )}

      {/* Confirmed Itinerary Status Banner */}
      {isConfirmed && (
        <div className="px-3.5 py-2.5 rounded-lg bg-signal-emerald/15 border border-signal-emerald/40 flex items-center justify-between text-xs font-mono text-signal-emerald animate-cx-pop">
          <span className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-signal-emerald" />
            <span>Consolidation Authorized: Lead Carrier {carrierPlate} itinerary committed to active dispatch schedule.</span>
          </span>
          <Badge variant="emerald" size="sm">
            {absorbedPlate} Freed
          </Badge>
        </div>
      )}

      {/* 2. Disjoint Tracks View (Before State or Split Mode) */}
      {(viewMode === "split" || viewMode === "merging") && (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 transition-all duration-300 ${
          viewMode === "merging" ? "opacity-90 scale-[0.99]" : ""
        }`}>
          {/* Carrier Track */}
          <div className="p-3.5 rounded-lg bg-surface-elevated/70 border border-signal-emerald/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-signal-emerald font-semibold flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Primary Carrier Route
              </span>
              <Badge variant="emerald" size="sm">{carrierPlate}</Badge>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {carrierStops.map((stop, idx) => (
                <React.Fragment key={`carrier-${stop}-${idx}`}>
                  <span
                    className={`px-2 py-1 rounded font-mono shrink-0 transition-colors ${
                      sharedStops.includes(stop)
                        ? "bg-signal-aqua/20 text-signal-aqua border border-signal-aqua/30 font-bold"
                        : "bg-surface text-ink-muted border border-border/60"
                    }`}
                  >
                    {stop}
                  </span>
                  {idx < carrierStops.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-ink-subtle shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Absorbed Track */}
          <div className="p-3.5 rounded-lg bg-surface-elevated/70 border border-signal-purple/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-signal-purple font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Absorbed Cargo Itinerary
              </span>
              <Badge variant="purple" size="sm">{absorbedPlate}</Badge>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {absorbedStops.map((stop, idx) => (
                <React.Fragment key={`absorbed-${stop}-${idx}`}>
                  <span
                    className={`px-2 py-1 rounded font-mono shrink-0 transition-colors ${
                      sharedStops.includes(stop)
                        ? "bg-signal-aqua/20 text-signal-aqua border border-signal-aqua/30 font-bold"
                        : "bg-signal-purple/10 text-signal-purple border border-signal-purple/30 font-medium"
                    }`}
                  >
                    {stop}
                  </span>
                  {idx < absorbedStops.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-ink-subtle shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Signature Unified Consolidated Corridor Track */}
      {(viewMode === "merging" || viewMode === "consolidated" || viewMode === "confirmed") && (
        <div className={`p-4 rounded-xl border space-y-4 transition-all duration-300 ${
          isConfirmed
            ? "bg-gradient-to-br from-surface-elevated/95 to-surface/95 border-signal-emerald/40 shadow-lg shadow-signal-emerald/10"
            : "bg-gradient-to-br from-surface-elevated/90 to-surface/90 border-signal-aqua/30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                isConfirmed ? "bg-signal-emerald" : "bg-signal-aqua animate-pulse"
              }`} />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink">
                {isConfirmed ? "Confirmed Consolidated Itinerary" : "Proposed Consolidated Corridor"} (Lead Carrier: {carrierPlate})
              </span>
            </div>
            <Badge variant={isConfirmed ? "emerald" : "aqua"} size="sm">
              {isConfirmed ? "Live Itinerary" : "Unified Sequence"}
            </Badge>
          </div>

          {/* Horizontal Corridor Rail with Connected Nodes */}
          <div className="relative pt-2 pb-3 overflow-x-auto">
            <div className="flex items-center min-w-max gap-0 px-2">
              {allStops.map((stop, idx) => {
                const nodeType = getNodeType(stop);
                const isSelected = activeStop === stop;
                const segInfo = segmentLoads[idx] || null;

                // Node badge styling
                let nodeStyle = "bg-surface border-border text-ink-muted";
                let roleLabel = "Waypoint";

                if (nodeType === "shared") {
                  nodeStyle = "bg-signal-aqua/20 border-signal-aqua text-signal-aqua ring-2 ring-signal-aqua/30 shadow-sm shadow-signal-aqua/20";
                  roleLabel = "Shared Corridor";
                } else if (nodeType === "additional") {
                  nodeStyle = "bg-signal-amber/20 border-signal-amber text-signal-amber border-dashed ring-2 ring-signal-amber/20";
                  roleLabel = "Added Insertion";
                } else if (nodeType === "carrier-endpoint") {
                  nodeStyle = isConfirmed
                    ? "bg-signal-emerald/25 border-signal-emerald text-signal-emerald ring-2 ring-signal-emerald/40 shadow-sm"
                    : "bg-signal-emerald/20 border-signal-emerald text-signal-emerald ring-1 ring-signal-emerald/30";
                  roleLabel = idx === 0 ? "Carrier Origin" : "Carrier Terminal";
                } else if (nodeType === "absorbed-endpoint") {
                  nodeStyle = "bg-signal-purple/20 border-signal-purple text-signal-purple ring-1 ring-signal-purple/30";
                  roleLabel = stop === absorbedStops[0] ? "Pickup Stop" : "Drop-off Stop";
                }

                return (
                  <React.Fragment key={`unified-${stop}-${idx}`}>
                    {/* Stop Node */}
                    <button
                      onClick={() => onSelectStop(stop)}
                      className={`group relative flex flex-col items-center focus:outline-none transition-all duration-150 motion-reduce:transition-none ${
                        isSelected ? "scale-105" : "hover:scale-102"
                      }`}
                    >
                      {/* Role Chip */}
                      <span className="text-[9px] font-mono text-ink-subtle uppercase mb-1.5 opacity-80 group-hover:opacity-100">
                        {roleLabel}
                      </span>

                      {/* Node circle */}
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center font-mono text-xs font-bold transition-all motion-reduce:transition-none ${nodeStyle} ${
                          isSelected ? "ring-4 ring-signal-aqua/40 shadow-md" : ""
                        }`}
                      >
                        <span>{idx + 1}</span>
                      </div>

                      {/* City Stop Name */}
                      <span className="font-mono text-xs font-bold text-ink mt-2 max-w-[100px] truncate text-center">
                        {stop}
                      </span>

                      {/* Load Preview at Stop */}
                      {segInfo && (
                        <span className="text-[10px] font-mono text-ink-subtle mt-0.5">
                          {segInfo.consolidatedLoad > 0 ? `${segInfo.consolidatedLoad.toLocaleString()} kg` : "Empty Leg"}
                        </span>
                      )}
                    </button>

                    {/* Segment connector arrow with segment payload tag */}
                    {idx < allStops.length - 1 && (
                      <div className="flex flex-col items-center justify-center px-3 min-w-[70px] relative">
                        {/* Segment Tag above line */}
                        {segInfo && (
                          <span className="text-[9px] font-mono text-ink-subtle mb-1 whitespace-nowrap bg-surface-elevated/90 px-1.5 py-0.5 rounded border border-border/50">
                            {segInfo.utilizationPct}% cap
                          </span>
                        )}

                        {/* Rail Connector */}
                        <div className="w-full flex items-center">
                          <div
                            className={`h-1 flex-1 rounded-full ${
                              segInfo && segInfo.utilizationPct > 85
                                ? "bg-signal-coral/60"
                                : segInfo && segInfo.utilizationPct > 65
                                ? "bg-signal-amber/60"
                                : isConfirmed
                                ? "bg-signal-emerald/60"
                                : "bg-signal-aqua/60"
                            }`}
                          />
                          <ArrowRight className={`w-3.5 h-3.5 -ml-1 shrink-0 ${
                            isConfirmed ? "text-signal-emerald" : "text-signal-aqua"
                          }`} />
                        </div>

                        {/* Headroom beneath line */}
                        {segInfo && totalCapacity > 0 && (
                          <span className="text-[9px] font-mono text-ink-subtle mt-1 whitespace-nowrap">
                            {segInfo.remainingCapacity.toLocaleString()} kg free
                          </span>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Visual Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-mono text-ink-muted border-t border-border/50">
        <span className="text-[10px] uppercase text-ink-subtle font-semibold">Legend:</span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-signal-emerald/20 border border-signal-emerald" />
            <span>Carrier Stop</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-signal-aqua/20 border border-signal-aqua ring-1 ring-signal-aqua/40" />
            <span>Shared Corridor Overlap</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-signal-purple/20 border border-signal-purple" />
            <span>Absorbed Pickup/Drop</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-signal-amber/20 border border-signal-amber border-dashed" />
            <span>Added Intermediate Insertion</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteSchematicVisualizer;
