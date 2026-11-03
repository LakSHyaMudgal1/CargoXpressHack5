import React from 'react';
import {
  GitMerge,
  Smartphone,
  Package,
  CheckCircle2,
  Lock
} from 'lucide-react';
import Badge from '../components/ui/Badge';

/**
 * Enterprise Capability Architecture (Features)
 * Varied, asymmetric editorial layouts detailing core platform systems.
 */
const Features = () => {
  return (
    <section id="feature" className="py-24 px-6 border-t border-border relative overflow-hidden bg-canvas">
      <div className="max-w-6xl mx-auto space-y-20">
        {/* Section Heading */}
        <div className="max-w-3xl space-y-3">
          <span className="cx-eyebrow text-signal-aqua">Platform Architecture</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink tracking-tight leading-tight">
            Built for mission-critical freight networks.
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Every feature in CargoXpress is engineered with strict capacity constraints, audit logging, and role-enforced telemetry guarantees.
          </p>
        </div>

        {/* Feature Story 1: Multi-Stage Consolidation (Split Editorial with Code / Audit Display) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2">
              <Badge variant="aqua" size="sm">Core Algorithmic Innovation</Badge>
              <span className="font-mono text-[11px] text-ink-subtle">Recursive Merging</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-ink leading-snug">
              Multi-Stage Consolidation: Active Carriers Keep Absorbing
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Unlike simplistic point-to-point dispatch tools, CargoXpress supports multi-stage carrier consolidation. An active lead carrier truck already hauling merged freight can evaluate secondary corridors and absorb additional compatible consignments along downstream segments, provided rated headroom permits.
            </p>
            <ul className="space-y-2.5 pt-2 text-xs font-mono text-ink-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-signal-aqua shrink-0" />
                <span>Recursive manifest consolidation checks existing carrier capacity</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-signal-aqua shrink-0" />
                <span>Prevents circular merges: active carriers cannot be absorbed by other carriers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-signal-aqua shrink-0" />
                <span>Authoritative audit trail written to MergeDecisionLog on each authorization</span>
              </li>
            </ul>
          </div>

          {/* Audit Trail Terminal Graphic */}
          <div className="lg:col-span-6 rounded-xl bg-surface-elevated border border-border p-5 font-mono text-xs shadow-subtle-card space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="text-[11px] text-ink-subtle uppercase tracking-wider">
                MergeDecisionLog — Audit Stream
              </span>
              <span className="text-[10px] text-signal-aqua bg-signal-aqua/10 px-2 py-0.5 rounded border border-signal-aqua/20">
                Authoritative Record
              </span>
            </div>

            <pre className="text-[11px] text-ink-secondary overflow-x-auto leading-relaxed p-2 bg-surface-base/80 rounded border border-border/40">
{`{
  "event": "PAIR_CONSOLIDATION_ACCEPTED",
  "carrierTruck": "MH-01-AA-1111",
  "carrierCapacity": 10000,
  "absorbedTruck": "DL-02-BB-2222",
  "absorbedLoad": 3400,
  "overlappingLegs": ["Surat", "Vadodara", "Ahmedabad"],
  "peakConsolidatedLoad": 7600,
  "status": "APPROVED",
  "absorbedTruckLifecycle": "TRANSFERRED_TO_FREE_POOL"
}`}
            </pre>
            <div className="flex items-center justify-between text-[11px] text-ink-subtle pt-1">
              <span>Security Guarantee: Non-Repudiable Event</span>
              <span className="text-signal-emerald">Integrity Verified</span>
            </div>
          </div>
        </div>

        {/* Feature Story 2: Three Distinct Pillars (Varied 3-Card Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card A: Topological Route Matching */}
          <div className="p-6 rounded-2xl bg-surface/80 border border-border space-y-4 hover:border-border-strong hover:bg-surface-elevated/70 transition-all flex flex-col justify-between shadow-subtle-card">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-signal-purple/15 border border-signal-purple/30 flex items-center justify-center text-signal-purple">
                <GitMerge className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-ink">
                Topological Subsequence Matching
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                The algorithm validates that candidate truck stops form a strict ordered sub-sequence of the carrier route. Unordered or divergent detours are rejected automatically to preserve scheduled delivery times.
              </p>
            </div>
            <div className="pt-3 border-t border-border/40 text-[11px] font-mono text-signal-purple">
              evaluateRouteCompatibility()
            </div>
          </div>

          {/* Card B: Driver GPS Cockpit & OTP */}
          <div className="p-6 rounded-2xl bg-surface/80 border border-border space-y-4 hover:border-border-strong hover:bg-surface-elevated/70 transition-all flex flex-col justify-between shadow-subtle-card">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-signal-aqua/15 border border-signal-aqua/30 flex items-center justify-center text-signal-aqua">
                <Smartphone className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-ink">
                Driver Telematics & Delivery POD
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Integrated React Native Expo driver cockpit with live GPS breadcrumb logging, stop arrival/departure transitions, and 6-digit OTP delivery validation with proof-of-delivery evidence capture.
              </p>
            </div>
            <div className="pt-3 border-t border-border/40 text-[11px] font-mono text-signal-aqua">
              TripStopExecution & Evidence
            </div>
          </div>

          {/* Card C: Trader Consignment Visibility */}
          <div className="p-6 rounded-2xl bg-surface/80 border border-border space-y-4 hover:border-border-strong hover:bg-surface-elevated/70 transition-all flex flex-col justify-between shadow-subtle-card">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-signal-emerald/15 border border-signal-emerald/30 flex items-center justify-center text-signal-emerald">
                <Package className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-ink">
                Consignor Shipment Visibility
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Shippers receive end-to-end visibility: assigned carrier truck license plate, driver contact numbers, real-time stop milestone indicators, and exception logs if deliveries are impeded.
              </p>
            </div>
            <div className="pt-3 border-t border-border/40 text-[11px] font-mono text-signal-emerald">
              Trader Consignment Console
            </div>
          </div>
        </div>

        {/* Feature Story 3: Strict Role-Scoped Security Isolation */}
        <div className="p-8 rounded-2xl bg-surface-elevated border border-border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-signal-aqua" />
              <span className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                Authorization & Security Isolation
              </span>
            </div>
            <h4 className="text-xl font-bold text-ink">
              Dedicated Workstations with Guaranteed Role Isolation
            </h4>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Dispatch Admins, Transport Carriers, and Consignor Traders each operate within fortified portal boundaries. Shippers cannot view competitor pricing; Carriers cannot tamper with dispatch decisions; Drivers access only their currently assigned manifest.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-surface border border-border text-ink">
              Admin: System Dispatch
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-surface border border-border text-ink">
              Carrier: Fleet Command
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-surface border border-border text-ink">
              Trader: Shippers Hub
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
