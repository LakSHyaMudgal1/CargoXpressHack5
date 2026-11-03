import React, { useState } from 'react';
import {
  Truck,
  ShieldCheck,
  Smartphone,
  Activity
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import CorridorTimeline from '../components/ui/CorridorTimeline';

/**
 * ProductPreview Component
 * Interactive, high-density demonstration of actual CargoXpress operational workstations.
 */
const ProductPreview = () => {
  const [activeView, setActiveView] = useState('corridors'); // 'corridors' | 'mergePairs' | 'telematics'

  return (
    <section className="py-20 px-6 border-t border-border relative overflow-hidden bg-surface-base/40">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="cx-eyebrow text-signal-aqua">Workstation Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-ink tracking-tight mt-2">
              Inside the Dispatch Console.
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
              Inspect the high-frequency tools platform dispatchers and transport carriers use daily to coordinate multi-stop consolidations and driver telematics.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-signal-aqua animate-ping" />
            <span className="text-xs font-mono uppercase tracking-wider text-ink-subtle">
              Interactive Preview Mode
            </span>
          </div>
        </div>

        {/* Console Container */}
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-elevated-card">
          {/* Top Bar Navigation */}
          <div className="px-5 py-3.5 border-b border-border bg-surface-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-signal-coral/80" />
              <span className="w-3 h-3 rounded-full bg-signal-amber/80" />
              <span className="w-3 h-3 rounded-full bg-signal-emerald/80" />
              <span className="ml-2 font-mono text-xs font-bold text-ink tracking-wide">
                CargoXpress <span className="text-signal-aqua">Terminal v1.0</span>
              </span>
            </div>

            {/* View Switcher */}
            <div className="inline-flex items-center p-1 rounded-lg bg-surface-base border border-border">
              <button
                type="button"
                onClick={() => setActiveView('corridors')}
                className={`px-3 py-1 rounded text-xs font-mono uppercase tracking-wider transition-all ${
                  activeView === 'corridors'
                    ? 'bg-surface-elevated text-signal-aqua font-semibold shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                1. Corridor Corrals
              </button>
              <button
                type="button"
                onClick={() => setActiveView('mergePairs')}
                className={`px-3 py-1 rounded text-xs font-mono uppercase tracking-wider transition-all ${
                  activeView === 'mergePairs'
                    ? 'bg-surface-elevated text-signal-purple font-semibold shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                2. Merge Queue
              </button>
              <button
                type="button"
                onClick={() => setActiveView('telematics')}
                className={`px-3 py-1 rounded text-xs font-mono uppercase tracking-wider transition-all ${
                  activeView === 'telematics'
                    ? 'bg-surface-elevated text-signal-emerald font-semibold shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                3. Driver Telematics
              </button>
            </div>
          </div>

          {/* Console Content */}
          <div className="p-6 space-y-6">
            {/* View 1: Active Corridors */}
            {activeView === 'corridors' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Active Western Freight Corridor (Manifest #CX-8841)</span>
                  <Badge variant="aqua" size="sm">Consolidated Carrier Active</Badge>
                </div>

                <div className="p-5 rounded-xl bg-surface-elevated/70 border border-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-signal-aqua" />
                      <span className="font-mono font-bold text-ink">MH-01-AA-1111</span>
                      <span className="text-ink-subtle">• FastTrack Logistics</span>
                    </div>
                    <span className="font-mono text-ink-muted">Rated: 10,000 kg • Peak Utilization: 76%</span>
                  </div>

                  {/* Corridor Timeline */}
                  <CorridorTimeline
                    stops={['Mumbai', 'Surat', 'Vadodara', 'Ahmedabad', 'Delhi']}
                    currentLoad={[4200, 7600, 7600, 4200]}
                    totalCapacity={10000}
                    source="Mumbai"
                    destination="Delhi"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-surface-elevated/40 border border-border">
                    <span className="text-ink-subtle block text-[10px]">Absorbed Vehicle</span>
                    <span className="font-semibold text-ink">DL-02-BB-2222 (Surat → Ahmedabad)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-elevated/40 border border-border">
                    <span className="text-ink-subtle block text-[10px]">FreeTruck Pool Status</span>
                    <span className="font-semibold text-signal-emerald">Released to Free Pool</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-elevated/40 border border-border">
                    <span className="text-ink-subtle block text-[10px]">Audit Log Authorization</span>
                    <span className="font-semibold text-signal-aqua">Signed by Dispatch Admin</span>
                  </div>
                </div>
              </div>
            )}

            {/* View 2: Merge Queue */}
            {activeView === 'mergePairs' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Algorithmic Merge Pair Opportunity</span>
                  <Badge variant="purple" size="sm">Feasibility Score: 100%</Badge>
                </div>

                <div className="p-5 rounded-xl bg-surface-elevated/70 border border-signal-purple/30 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-surface-base border border-border space-y-1">
                      <span className="text-[10px] font-mono uppercase text-ink-subtle block">Lead Carrier Candidate</span>
                      <span className="font-mono font-bold text-ink">TN-04-DD-4444 (12,000 kg)</span>
                      <p className="text-ink-muted text-[11px] font-mono">Delhi → Agra → Lucknow → Kolkata</p>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-base border border-border space-y-1">
                      <span className="text-[10px] font-mono uppercase text-ink-subtle block">Secondary Candidate to Absorb</span>
                      <span className="font-mono font-bold text-ink">UP-14-EE-5555 (4,000 kg)</span>
                      <p className="text-ink-muted text-[11px] font-mono">Agra → Lucknow (Compatible Subset)</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-signal-purple/10 border border-signal-purple/20 text-xs flex items-center justify-between">
                    <span className="text-ink">
                      Segment Check: Agra → Lucknow combined payload will be <strong>7,800 kg</strong> (65% capacity of lead carrier).
                    </span>
                    <Badge variant="emerald" size="sm">Safe Headroom</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* View 3: Driver Telematics */}
            {activeView === 'telematics' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Driver Cockpit & Stop-by-Stop Handoff</span>
                  <Badge variant="emerald" size="sm">GPS Telematics Active</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-surface-elevated/70 border border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-signal-aqua" />
                      <span className="font-semibold text-ink">Expo Driver Cockpit</span>
                    </div>
                    <p className="text-ink-muted text-[11px] leading-relaxed">
                      Drivers log in with verified mobile or email, receiving assigned manifest stops and turn-by-turn sequence.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-elevated/70 border border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-signal-emerald" />
                      <span className="font-semibold text-ink">Milestone Transitions</span>
                    </div>
                    <p className="text-ink-muted text-[11px] leading-relaxed">
                      Stop status progression strictly enforced: <code>scheduled</code> → <code>arrived</code> → <code>completed</code>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-elevated/70 border border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-signal-purple" />
                      <span className="font-semibold text-ink">OTP Handshake & POD</span>
                    </div>
                    <p className="text-ink-muted text-[11px] leading-relaxed">
                      Consignments require recipient OTP handshake and photo evidence upload before final completion is logged.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductPreview;
