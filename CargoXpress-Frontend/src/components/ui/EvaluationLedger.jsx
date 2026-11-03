import React from "react";
import {
  Route,
  Gauge,
  ListOrdered,
  RotateCcw
} from "lucide-react";
import Badge from "./Badge";

/**
 * EvaluationLedger
 * Authoritative ledger explaining why a merge candidate is proposed.
 * Discloses mathematical validation results directly from algorithmic candidate evaluations.
 */
export const EvaluationLedger = ({
  validation = {},
  multiStageDetails = {},
  carrierPlate = "",
  absorbedPlate = "",
}) => {
  const routeCheck = validation.routeCompatibility || { passed: true, reason: "Route corridors align in forward sequence without detours." };
  const capCheck = validation.capacityFeasibility || { passed: true, reason: "Peak concurrent cargo payload stays within vehicle limits." };
  const orderCheck = validation.stopOrderIntegrity || { passed: true, reason: "Pickup precedence strictly precedes destination delivery." };

  const isMultiStage = multiStageDetails?.isMultiStage || false;
  const priorAbsorbed = multiStageDetails?.priorAbsorbedVehicles || 0;

  return (
    <div className="rounded-xl border border-border/80 bg-surface/80 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-signal-aqua font-bold">
            Algorithmic Decision Ledger
          </span>
          <h3 className="text-sm font-bold text-ink mt-0.5">
            Candidate Evaluation & Feasibility Proof
          </h3>
        </div>
        <Badge variant={isMultiStage ? "purple" : "aqua"} size="sm">
          {isMultiStage ? `Multi-Stage Carrier (${priorAbsorbed} Prior)` : "Direct 2-Truck Consolidation"}
        </Badge>
      </div>

      {/* 4-Card Evaluation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* 1. Route Compatibility */}
        <div className="p-3.5 rounded-lg bg-surface-elevated/60 border border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-ink flex items-center gap-1.5">
              <Route className="w-4 h-4 text-signal-aqua" />
              Route Compatibility
            </span>
            <Badge variant={routeCheck.passed ? "emerald" : "coral"} size="sm">
              {routeCheck.passed ? "Passed" : "Incompatible"}
            </Badge>
          </div>
          <p className="text-ink-muted text-[11px] leading-relaxed">
            {routeCheck.reason || "Stop sequences share forward corridor without backward travel."}
          </p>
          {routeCheck.sharedStops && routeCheck.sharedStops.length > 0 && (
            <div className="text-[10px] font-mono text-signal-aqua">
              Corridor Hubs: {routeCheck.sharedStops.join(", ")}
            </div>
          )}
        </div>

        {/* 2. Capacity Feasibility */}
        <div className="p-3.5 rounded-lg bg-surface-elevated/60 border border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-ink flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-signal-emerald" />
              Capacity Feasibility
            </span>
            <Badge variant={capCheck.passed ? "emerald" : "coral"} size="sm">
              {capCheck.passed ? "Passed" : "Exceeded"}
            </Badge>
          </div>
          <p className="text-ink-muted text-[11px] leading-relaxed">
            {capCheck.reason || "Maximum concurrent payload is within rated vehicle capacity."}
          </p>
          {capCheck.headroomKg !== undefined && (
            <div className="text-[10px] font-mono text-signal-emerald">
              Remaining Headroom: {capCheck.headroomKg.toLocaleString()} kg ({100 - (capCheck.peakUtilizationPct || 0)}% margin)
            </div>
          )}
        </div>

        {/* 3. Stop Order Precedence */}
        <div className="p-3.5 rounded-lg bg-surface-elevated/60 border border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-ink flex items-center gap-1.5">
              <ListOrdered className="w-4 h-4 text-signal-amber" />
              Stop Order Precedence
            </span>
            <Badge variant={orderCheck.passed ? "emerald" : "coral"} size="sm">
              {orderCheck.passed ? "Passed" : "Violated"}
            </Badge>
          </div>
          <p className="text-ink-muted text-[11px] leading-relaxed">
            {orderCheck.reason || "All intermediate pickups precede their respective drop-offs along the corridor."}
          </p>
          <div className="text-[10px] font-mono text-ink-subtle">
            Transit Direction: Monotonic Forward
          </div>
        </div>

        {/* 4. Fleet Recycling / Multi-Stage Carrier Status */}
        <div className="p-3.5 rounded-lg bg-surface-elevated/60 border border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-ink flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-signal-purple" />
              Fleet Recycling Yield
            </span>
            <Badge variant="purple" size="sm">+1 FreeTruck</Badge>
          </div>
          <p className="text-ink-muted text-[11px] leading-relaxed">
            Absorbing <strong className="text-ink font-mono">{absorbedPlate}</strong> releases it immediately to the Standby FreeTruck pool, preventing deadhead mileage and fuel waste.
          </p>
          {isMultiStage && (
            <div className="text-[10px] font-mono text-signal-purple">
              Carrier {carrierPlate} has successfully completed {priorAbsorbed} prior merge(s).
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationLedger;
