import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight } from 'lucide-react';
import MergeSimulator from './MergeSimulator';

const HeroSection = () => {
  const user = useSelector((store) => store.user);
  const isAdmin = Boolean(user?.emailId?.endsWith('@cargoxpress.com'));
  const isTrader = Boolean(user && !isAdmin && user.aadharNumber !== undefined);
  const isCompany = Boolean(user && !isAdmin && user.registrationNumber !== undefined);

  const scrollToVisualizer = () => {
    document.getElementById('merge-visualizer')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Primary action config based on user role
  const getPrimaryAction = () => {
    if (!user) {
      return {
        label: 'Enter Dispatch Platform',
        href: '/login',
        badge: 'Launch',
      };
    }
    if (isAdmin) {
      return {
        label: 'Open Dispatch Command',
        href: '/admin',
        badge: 'Dispatcher Active',
      };
    }
    if (isCompany) {
      return {
        label: 'Open Fleet Operations',
        href: '/company',
        badge: 'Carrier Active',
      };
    }
    if (isTrader) {
      return {
        label: 'Open Consignments Hub',
        href: '/trader',
        badge: 'Consignor Active',
      };
    }
    return {
      label: 'Open Workstation',
      href: '/profile',
      badge: 'Authenticated',
    };
  };

  const primaryAction = getPrimaryAction();

  return (
    <section className="relative min-h-screen flex flex-col pt-24 pb-16 px-6 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(25,232,200,0.08),transparent)] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-signal-aqua/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-signal-emerald/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Content Header */}
      <div className="max-w-6xl mx-auto w-full relative z-10 flex flex-col items-center text-center space-y-6 pt-4 sm:pt-10">
        {/* Editorial Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated/90 border border-border-strong text-xs font-mono shadow-sm">
          <span className="w-2 h-2 rounded-full bg-signal-aqua animate-ping" />
          <span className="text-ink font-semibold uppercase tracking-wider text-[11px]">
            Intelligent Freight Consolidation
          </span>
          <span className="text-ink-subtle">|</span>
          <span className="text-signal-aqua font-mono text-[11px]">v1.0 Release</span>
        </div>

        {/* Master Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-ink max-w-4xl leading-[1.08]">
          Move more freight.<br />
          <span className="text-signal-aqua">Waste fewer trips.</span>
        </h1>

        {/* Value Proposition */}
        <p className="text-base sm:text-lg text-ink-secondary max-w-2xl leading-relaxed">
          CargoXpress matches overlapping regional delivery corridors, merging compatible truckloads onto a single lead carrier while returning absorbed vehicles back to the available pool.
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to={primaryAction.href}>
            <button className="group flex items-center gap-2 px-6 py-3 bg-action-primary text-action-primary-text hover:bg-action-primary-hover font-semibold text-sm rounded-lg transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] select-none">
              <span>{primaryAction.label}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>

          <button
            type="button"
            onClick={scrollToVisualizer}
            className="px-5 py-3 rounded-lg bg-surface-elevated text-ink hover:bg-surface-hover border border-border hover:border-border-strong text-sm font-semibold transition-all shadow-sm select-none"
          >
            Explore Merge Engine
          </button>
        </div>

        {/* Architectural Principles Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full pt-8 text-left">
          <div className="p-4 rounded-xl bg-surface/80 border border-border shadow-subtle-card space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-signal-aqua font-semibold block">
              1. Corridor Topology
            </span>
            <span className="text-xs sm:text-sm font-bold text-ink block">
              Subsequence Matching
            </span>
            <p className="text-[11px] text-ink-subtle leading-normal">
              Pairs routes where secondary stops form a topological subset of the lead carrier.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/80 border border-border shadow-subtle-card space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-signal-emerald font-semibold block">
              2. Segment Capacity
            </span>
            <span className="text-xs sm:text-sm font-bold text-ink block">
              Continuous Headroom
            </span>
            <p className="text-[11px] text-ink-subtle leading-normal">
              Evaluates payload limits across each individual leg to guarantee no overload violations.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/80 border border-border shadow-subtle-card space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-signal-purple font-semibold block">
              3. FreeTruck Lifecycle
            </span>
            <span className="text-xs sm:text-sm font-bold text-ink block">
              Fleet Capacity Recovery
            </span>
            <p className="text-[11px] text-ink-subtle leading-normal">
              Absorbed vehicles are released to the FreeTruck pool for immediate new booking assignment.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/80 border border-border shadow-subtle-card space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-signal-amber font-semibold block">
              4. Driver Cockpit
            </span>
            <span className="text-xs sm:text-sm font-bold text-ink block">
              GPS & Cryptographic POD
            </span>
            <p className="text-[11px] text-ink-subtle leading-normal">
              Turn-by-turn stop status transitions verified by recipient OTP signature and evidence.
            </p>
          </div>
        </div>
      </div>

      {/* Signature Interactive Visualizer */}
      <MergeSimulator />
    </section>
  );
};

export default HeroSection;
