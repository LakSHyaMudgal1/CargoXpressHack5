import React from 'react';
import { GitMerge, CalendarClock, Boxes, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../components/ui/Badge';

/**
 * CargoXpress Admin Action Tiles
 * Inspired by CE Growth Partners: numbered stages (01, 02, 03), hairline borders, arrow CTAs.
 */
const AdminSection = () => {
  const actions = [
    {
      step: '01',
      title: 'Mergeable Trucks',
      description: 'Inspect overlapping routes and consolidated capacities. Approve mergers or keep trucks autonomous.',
      href: '/mergeable',
      icon: GitMerge,
      badge: 'AI Merge Engine',
      badgeVariant: 'aqua',
      color: 'text-signal-aqua',
      bg: 'bg-signal-aqua/10',
      border: 'border-signal-aqua/20',
    },
    {
      step: '02',
      title: 'Approved Schedules',
      description: 'Review finalized multi-stop merged schedules, consolidated manifests, and real-time dispatch statuses.',
      href: '/mergedSchedule',
      icon: CalendarClock,
      badge: 'Active Dispatches',
      badgeVariant: 'emerald',
      color: 'text-signal-emerald',
      bg: 'bg-signal-emerald/10',
      border: 'border-signal-emerald/20',
    },
    {
      step: '03',
      title: 'Trader Merge Pool',
      description: 'Match consignor cargo requests with available truck capacity along compatible transit corridors.',
      href: '/mergeableTraders',
      icon: Boxes,
      badge: 'Load Matching',
      badgeVariant: 'purple',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="cx-eyebrow text-signal-aqua">
          Algorithmic Optimization
        </p>
        <span className="text-xs font-mono text-ink-subtle">
          3 Engines Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((act) => (
          <Link
            key={act.step}
            to={act.href}
            className="group relative p-6 rounded-xl bg-surface/90 border border-border hover:border-border-strong hover:bg-surface-elevated/80 transition-all duration-200 flex flex-col justify-between shadow-subtle-card overflow-hidden"
          >
            {/* Top row: step number + icon + badge */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="font-mono text-xs font-bold text-ink-subtle/80 tracking-widest">
                  {act.step}
                </span>
                <Badge variant={act.badgeVariant} size="sm" className="font-mono text-[10px] uppercase">
                  {act.badge}
                </Badge>
              </div>

              <div className="flex items-center gap-3 mb-2.5">
                <div className={`w-9 h-9 rounded-lg ${act.bg} border ${act.border} flex items-center justify-center ${act.color} shrink-0 group-hover:scale-105 transition-transform`}>
                  <act.icon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-ink group-hover:text-signal-aqua transition-colors tracking-tight">
                  {act.title}
                </h3>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                {act.description}
              </p>
            </div>

            {/* Bottom link CTA */}
            <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-medium text-ink-subtle group-hover:text-signal-aqua transition-colors">
              <span>Launch Engine</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminSection;
