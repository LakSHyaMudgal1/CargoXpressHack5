import React, { useState } from 'react';
import {
  Truck,
  GitMerge,
  RotateCcw,
  CheckCircle2,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import Badge from '../components/ui/Badge';

/**
 * CargoXpress Signature Visual: Interactive Load Consolidation Simulator
 * Demonstrates how two independent truck routes are topologically analyzed
 * and consolidated into one lead carrier while returning the absorbed truck to the FreeTruck pool.
 */
const MergeSimulator = () => {
  const [isMerged, setIsMerged] = useState(true);
  const [selectedLegIndex, setSelectedLegIndex] = useState(1); // 1 = Surat -> Vadodara

  const stops = ['Mumbai', 'Surat', 'Vadodara', 'Ahmedabad', 'Delhi'];

  // Segment descriptions and load mathematics
  const legData = [
    {
      from: 'Mumbai',
      to: 'Surat',
      truckALoad: 4200,
      truckBLoad: 0,
      mergedLoad: 4200,
      capacityA: 10000,
      notes: 'Initial pickup at Mumbai. Only Lead Carrier MH-01-AA-1111 is operating on this segment.',
    },
    {
      from: 'Surat',
      to: 'Vadodara',
      truckALoad: 4200,
      truckBLoad: 3400,
      mergedLoad: 7600,
      capacityA: 10000,
      notes: 'Critical overlap segment. Carrier absorbs 3,400 kg from DL-02-BB-2222. Total: 7,600 kg (76% optimal).',
    },
    {
      from: 'Vadodara',
      to: 'Ahmedabad',
      truckALoad: 4200,
      truckBLoad: 3400,
      mergedLoad: 7600,
      capacityA: 10000,
      notes: 'Shared regional transit leg. Combined freight travels in single vehicle under rated 10,000 kg capacity.',
    },
    {
      from: 'Ahmedabad',
      to: 'Delhi',
      truckALoad: 4200,
      truckBLoad: 0,
      mergedLoad: 4200,
      capacityA: 10000,
      notes: 'Final leg to Delhi terminal. Absorbed cargo completed; Lead Carrier delivers remaining consignments.',
    },
  ];

  const currentLeg = legData[selectedLegIndex] || legData[1];

  return (
    <div id="merge-visualizer" className="w-full max-w-6xl mx-auto my-12 scroll-mt-24">
      {/* Outer Shell Card */}
      <div className="rounded-2xl bg-surface/90 border border-border overflow-hidden shadow-elevated-card">
        {/* Terminal Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-signal-aqua/15 border border-signal-aqua/30 flex items-center justify-center text-signal-aqua shrink-0">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-ink font-semibold">
                  Intelligent Route Merging Architecture
                </span>
                <Badge variant="aqua" size="sm">Interactive Engine</Badge>
              </div>
              <p className="text-xs text-ink-muted">
                Corridor: Mumbai → Delhi via Surat, Vadodara & Ahmedabad
              </p>
            </div>
          </div>

          {/* Toggle Controls */}
          <div className="inline-flex items-center p-1 rounded-lg bg-surface-base border border-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsMerged(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all select-none ${
                !isMerged
                  ? 'bg-surface-elevated text-ink border border-border-strong font-semibold shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              1. Before Merge (2 Trucks)
            </button>
            <button
              type="button"
              onClick={() => setIsMerged(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all select-none ${
                isMerged
                  ? 'bg-signal-aqua/15 text-signal-aqua border border-signal-aqua/30 font-semibold shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              2. Consolidated (1 Carrier + 1 FreeTruck)
            </button>
          </div>
        </div>

        {/* Simulator Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Status Alert Readout */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all duration-300 ${
              isMerged
                ? 'bg-signal-emerald/10 border-signal-emerald/30 text-ink'
                : 'bg-signal-amber/10 border-signal-amber/30 text-ink'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isMerged ? (
                <CheckCircle2 className="w-4 h-4 text-signal-emerald shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-signal-amber shrink-0" />
              )}
              <span className="font-semibold">
                {isMerged
                  ? 'Optimized State: Lead Carrier MH-01-AA-1111 operating at 76% efficiency. DL-02-BB-2222 freed.'
                  : 'Redundant Dispatch: Two vehicles burning separate fuel across identical Surat → Ahmedabad corridor.'}
              </span>
            </div>

            <span className="font-mono text-[11px] text-ink-subtle">
              {isMerged ? '1 Engine Active • 0 Empty Miles' : '2 Engines Active • 58% Empty Capacity'}
            </span>
          </div>

          {/* Visualization Tracks */}
          <div className="space-y-6">
            {/* Track 1: Truck A (Lead Carrier) */}
            <div className="p-5 rounded-xl bg-surface-elevated/70 border border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-signal-aqua/15 border border-signal-aqua/30 flex items-center justify-center text-signal-aqua shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-semibold text-ink">
                      Vehicle A: MH-01-AA-1111
                    </span>
                    <span className="text-[11px] text-ink-subtle ml-2">
                      (FastTrack Logistics • 10,000 kg Rated)
                    </span>
                  </div>
                </div>

                <Badge variant={isMerged ? 'emerald' : 'neutral'} size="sm">
                  {isMerged ? 'Lead Consolidated Carrier' : 'Independent Carrier (42% Loaded)'}
                </Badge>
              </div>

              {/* Waypoint Track */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {stops.map((stop, i) => (
                  <div key={stop} className="flex flex-col items-center text-center">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                        i === 0
                          ? 'border-signal-aqua bg-surface text-signal-aqua'
                          : i === stops.length - 1
                          ? 'border-signal-emerald bg-surface text-signal-emerald'
                          : 'border-border-strong bg-surface text-ink-muted'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-xs font-semibold text-ink mt-1.5 truncate max-w-full">
                      {stop}
                    </span>
                    <span className="text-[10px] font-mono text-ink-subtle">
                      {i === 0 ? 'Origin' : i === stops.length - 1 ? 'Terminal' : `Stop ${i}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Payload Gauge Along Segments */}
              <div className="grid grid-cols-4 gap-3 pt-2">
                {legData.map((leg, idx) => {
                  const load = isMerged ? leg.mergedLoad : leg.truckALoad;
                  const pct = Math.round((load / leg.capacityA) * 100);
                  const isSelected = selectedLegIndex === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedLegIndex(idx)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-signal-aqua/60 bg-surface ring-1 ring-signal-aqua/30'
                          : 'border-border/60 bg-surface/50 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="text-ink-muted">{leg.from.slice(0, 3)} → {leg.to.slice(0, 3)}</span>
                        <span className={`font-semibold ${pct > 70 ? 'text-signal-emerald' : 'text-signal-aqua'}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-base overflow-hidden border border-border/40">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            pct > 70 ? 'bg-signal-emerald' : 'bg-signal-aqua'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-ink-subtle block mt-1.5">
                        {load.toLocaleString()} / 10,000 kg
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Track 2: Truck B (Secondary Vehicle) */}
            <div
              className={`p-5 rounded-xl border transition-all duration-300 ${
                isMerged
                  ? 'bg-surface-elevated/40 border-signal-emerald/20 border-dashed'
                  : 'bg-surface-elevated/70 border-border'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${
                    isMerged
                      ? 'bg-signal-emerald/15 border-signal-emerald/30 text-signal-emerald'
                      : 'bg-signal-amber/15 border-signal-amber/30 text-signal-amber'
                  }`}>
                    {isMerged ? <RotateCcw className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="font-mono text-xs font-semibold text-ink">
                      Vehicle B: DL-02-BB-2222
                    </span>
                    <span className="text-[11px] text-ink-subtle ml-2">
                      (NorthStar Transport • 5,000 kg Rated)
                    </span>
                  </div>
                </div>

                <Badge variant={isMerged ? 'emerald' : 'amber'} size="sm">
                  {isMerged ? 'Absorbed → FreeTruck Pool Available' : 'Running Overlapping Corridor (3,400 kg)'}
                </Badge>
              </div>

              {/* Waypoints for Truck B */}
              <div className="mt-4 pt-3 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-xs">
                  <span className="text-ink-muted">Itinerary Subsequence: </span>
                  <span className="font-mono font-semibold text-ink">
                    Surat → Vadodara → Ahmedabad
                  </span>
                  <span className="text-ink-subtle ml-2">
                    ({isMerged ? 'Cargo transferred to Carrier A' : '3,400 kg loaded'})
                  </span>
                </div>

                {isMerged ? (
                  <div className="flex items-center gap-2 text-xs font-mono text-signal-emerald">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>0 km empty mileage • Freed for new trip</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono text-signal-coral">
                    <span>Duplicate toll & diesel expenses active</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Leg Deep-Dive Inspector */}
          <div className="p-4 rounded-xl bg-surface-base border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-signal-aqua" />
                <span>Segment Telemetry Inspection: {currentLeg.from} → {currentLeg.to}</span>
              </span>
              <span className="font-mono text-[11px] text-ink-subtle">
                Click segment above to inspect
              </span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              {currentLeg.notes}
            </p>
          </div>
        </div>

        {/* Footer Metrics Banner */}
        <div className="px-6 py-4 border-t border-border bg-surface-subtle/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle block">
              Carrier Payload
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-ink">
              {isMerged ? '7,600 kg (76%)' : '4,200 kg (42%)'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle block">
              FreeTruck Pool
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-signal-emerald">
              {isMerged ? '+1 Vehicle Freed' : '0 in Pool'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle block">
              Duplicate Engines
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-ink">
              {isMerged ? '0 (Eliminated)' : '2 Trucks Running'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle block">
              Consolidation Audit
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-signal-aqua">
              {isMerged ? 'Verified Feasible' : 'Unmerged Pair'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergeSimulator;
