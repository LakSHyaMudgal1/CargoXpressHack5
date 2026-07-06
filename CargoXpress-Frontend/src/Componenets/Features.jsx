import { GitMerge, Route, DollarSign, Users, Zap, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: GitMerge,
    title: 'Intelligent Cargo Merging',
    desc: 'Our algorithm automatically finds trucks with compatible routes and merges shipments — maximising capacity utilisation and cutting empty miles.',
    accent: 'from-emerald-500 to-teal-500',
    span: 'md:col-span-2',
  },
  {
    icon: Route,
    title: 'Route Optimization',
    desc: 'Define multi-stop routes and let the platform match them with trader requests intelligently.',
    accent: 'from-cyan-500 to-blue-500',
    span: '',
  },
  {
    icon: DollarSign,
    title: 'Up to 40% Cost Savings',
    desc: 'Shared logistics means shared cost. Both traders and companies benefit from every successful merge.',
    accent: 'from-violet-500 to-purple-500',
    span: '',
  },
  {
    icon: Users,
    title: 'Multi-Role Platform',
    desc: 'Traders, transport companies, and admins each get a tailored experience and workflows built for their role.',
    accent: 'from-orange-500 to-amber-500',
    span: '',
  },
  {
    icon: Zap,
    title: 'Instant Scheduling',
    desc: 'Add a truck, define the route, submit. The entire scheduling workflow takes under two minutes.',
    accent: 'from-pink-500 to-rose-500',
    span: '',
  },
  {
    icon: BarChart3,
    title: 'Admin Oversight',
    desc: 'Full visibility into all companies, traders, trucks, routes, and merged schedules from a central dashboard.',
    accent: 'from-emerald-500 to-cyan-500',
    span: 'md:col-span-2',
  },
];

const Features = () => (
  <section id="feature" className="py-28 px-6">
    <div className="max-w-6xl mx-auto">

      {/* Heading */}
      <div className="mb-16">
        <span className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">Platform Features</span>
        <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 leading-tight">
          Everything you need.<br />
          <span className="text-white/30">Nothing you don't.</span>
        </h2>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {features.map(({ icon: Icon, title, desc, accent, span }) => (
          <div
            key={title}
            className={`group relative p-6 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all duration-300 overflow-hidden ${span}`}
          >
            {/* Glow on hover */}
            <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-5 rounded-full blur-2xl transition-opacity duration-500`} />

            <div className={`inline-flex w-11 h-11 rounded-xl bg-gradient-to-br ${accent} items-center justify-center mb-5 shadow-lg`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
            <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
