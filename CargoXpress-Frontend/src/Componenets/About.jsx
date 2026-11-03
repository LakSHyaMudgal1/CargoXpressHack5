import React from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  GitMerge,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

/**
 * How It Works: 4-Stage Operational Lifecycle
 * Verified capabilities directly matching the CargoXpress algorithm & models.
 */
const About = () => {

  const steps = [
    {
      step: '01',
      title: 'Register Fleet & Establish Itineraries',
      desc: 'Transport carriers register commercial vehicles with rated payload capacity (kg) and map origin-to-destination corridors with intermediate drop-off waypoints. Shippers log required consignment loads.',
      icon: Truck,
      color: 'text-signal-aqua',
      bg: 'bg-signal-aqua/10',
      border: 'border-signal-aqua/20',
      metric: 'Carrier Fleet Model',
    },
    {
      step: '02',
      title: 'Corridor Topology & Capacity Analysis',
      desc: 'The optimization engine evaluates routes for topological subset compatibility. It continuously calculates segment headroom along every intermediate leg to ensure cumulative loads never exceed safety limits.',
      icon: GitMerge,
      color: 'text-signal-purple',
      bg: 'bg-signal-purple/10',
      border: 'border-signal-purple/20',
      metric: 'Topological Subsequence Algorithm',
    },
    {
      step: '03',
      title: 'Dispatch Authorization & FreeTruck Pool',
      desc: 'Platform dispatchers or drivers review the merge opportunity. Upon acceptance, the lead carrier schedule is consolidated, an authoritative audit record is logged to MergeDecisionLog, and the absorbed truck is recycled to the FreeTruck pool.',
      icon: ShieldCheck,
      color: 'text-signal-emerald',
      bg: 'bg-signal-emerald/10',
      border: 'border-signal-emerald/20',
      metric: 'Audit-Verified Manifest Consolidation',
    },
    {
      step: '04',
      title: 'Driver Telematics & Secure Delivery POD',
      desc: 'Assigned drivers execute the unified route through the mobile cockpit. Intermediate stops advance from scheduled to arrived to completed. Final cargo delivery requires a 6-digit recipient OTP handshake and photo evidence.',
      icon: Smartphone,
      color: 'text-signal-amber',
      bg: 'bg-signal-amber/10',
      border: 'border-signal-amber/20',
      metric: 'Cryptographic Delivery Handshake',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-border relative overflow-hidden bg-surface-subtle/20 scroll-mt-20">
      <div id="about" className="max-w-6xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <span className="cx-eyebrow text-signal-emerald">Operational Lifecycle</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink tracking-tight leading-tight">
            How freight consolidation works.
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            From vehicle registry to final recipient OTP handoff, each operational phase is algorithmically calculated, audited, and tracked across role-isolated portals.
          </p>
        </div>

        {/* 4 Process Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.step}
                className="p-6 sm:p-8 rounded-2xl bg-surface/80 border border-border hover:border-border-strong hover:bg-surface-elevated/70 transition-all duration-200 space-y-5 shadow-subtle-card flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-ink-subtle">
                      STAGE {st.step}
                    </span>
                    <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                      {st.metric}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${st.bg} ${st.border} border flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${st.color}`} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-ink">
                      {st.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    {st.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center gap-2 text-[11px] font-mono text-ink-subtle">
                  <CheckCircle2 className="w-3.5 h-3.5 text-signal-emerald shrink-0" />
                  <span>Verified Platform Capability</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface-elevated border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-base sm:text-lg font-bold text-ink">
              Ready to eliminate empty vehicle mileage?
            </h4>
            <p className="text-xs sm:text-sm text-ink-muted">
              Access the dispatch control center or onboard your commercial fleet in under two minutes.
            </p>
          </div>

          <Link to="/login">
            <Button variant="primary" size="md" rightIcon={ArrowRight}>
              Launch Platform
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default About;
