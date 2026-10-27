import { GitMerge, Route, DollarSign, Users, Zap, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: GitMerge,
    title: 'Intelligent Cargo Merging',
    desc: 'Algorithmic routing matches vehicles with compatible delivery corridors and consolidates shipments to maximize capacity utilization and eliminate empty miles.',
    badge: 'Core Engine',
    span: 'md:col-span-2',
    color: 'text-signal-aqua',
    bg: 'bg-signal-aqua/10',
    border: 'border-signal-aqua/20',
  },
  {
    icon: Route,
    title: 'Corridor Optimization',
    desc: 'Establish multi-stop transit corridors and allow the system to pair intermediate waypoints automatically.',
    badge: 'Routing',
    span: '',
    color: 'text-signal-emerald',
    bg: 'bg-signal-emerald/10',
    border: 'border-signal-emerald/20',
  },
  {
    icon: DollarSign,
    title: 'Measurable Cost Savings',
    desc: 'Load sharing lowers per-ton transit costs for consignors while maximizing revenue yield for transport carriers.',
    badge: 'Efficiency',
    span: '',
    color: 'text-signal-amber',
    bg: 'bg-signal-amber/10',
    border: 'border-signal-amber/20',
  },
  {
    icon: Users,
    title: 'Role-Isolated Workstations',
    desc: 'Consignors, transport carriers, and platform dispatchers each operate dedicated portals scoped to their role.',
    badge: 'Access Control',
    span: '',
    color: 'text-signal-purple',
    bg: 'bg-signal-purple/10',
    border: 'border-signal-purple/20',
  },
  {
    icon: Zap,
    title: 'Rapid Fleet Onboarding',
    desc: 'Register commercial vehicles, define payload headroom, and launch corridor schedules in under two minutes.',
    badge: 'Dispatch',
    span: '',
    color: 'text-signal-aqua',
    bg: 'bg-signal-aqua/10',
    border: 'border-signal-aqua/20',
  },
  {
    icon: BarChart3,
    title: 'Central Dispatch Command',
    desc: 'Comprehensive oversight into regional corridors, active manifests, FreeTruck pools, and algorithmic merge decisions.',
    badge: 'Fleet Ops',
    span: 'md:col-span-2',
    color: 'text-signal-emerald',
    bg: 'bg-signal-emerald/10',
    border: 'border-signal-emerald/20',
  },
];

const Features = () => (
  <section id="feature" className="py-24 px-6 border-t border-border">
    <div className="max-w-6xl mx-auto">

      {/* Heading */}
      <div className="mb-14">
        <span className="cx-eyebrow text-signal-aqua">Platform Capabilities</span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink mt-3 leading-tight tracking-tight">
          Engineered for logistics excellence.<br />
          <span className="text-ink-subtle">Precision dispatch at nationwide scale.</span>
        </h2>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {features.map(({ icon: Icon, title, desc, badge, span, color, bg, border }) => (
          <div
            key={title}
            className={`group relative p-6 rounded-xl bg-surface/80 border border-border hover:border-border-strong hover:bg-surface-elevated/80 transition-all duration-200 flex flex-col justify-between shadow-subtle-card ${span}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className={`w-10 h-10 rounded-lg ${bg} border ${border} flex items-center justify-center ${color} shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle px-2 py-0.5 rounded border border-border bg-surface-subtle">
                  {badge}
                </span>
              </div>
              <h3 className="text-ink font-semibold text-base mb-2 group-hover:text-signal-aqua transition-colors">
                {title}
              </h3>
              <p className="text-ink-muted text-xs sm:text-sm leading-relaxed">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
