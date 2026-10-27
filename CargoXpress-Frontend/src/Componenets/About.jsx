import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LogIn, Truck, MapPin, GitMerge, Rocket } from 'lucide-react';

const steps = [
  {
    icon: LogIn,
    label: 'Create Account',
    desc: 'Sign up as a Trader or Transport Company in under a minute.',
    tag: 'Step 1',
  },
  {
    icon: Truck,
    label: 'Register Your Truck',
    desc: 'Add your truck with total capacity and current load at each stop.',
    tag: 'Step 2',
  },
  {
    icon: MapPin,
    label: 'Schedule a Route',
    desc: 'Define source, destination and all intermediate stops for the truck.',
    tag: 'Step 3',
  },
  {
    icon: GitMerge,
    label: 'Admin Merges Cargo',
    desc: 'The platform intelligently pairs compatible trucks and trader requests.',
    tag: 'Step 4',
  },
  {
    icon: Rocket,
    label: 'Dispatch & Save',
    desc: 'Optimised trucks are dispatched — cutting costs and reducing emissions.',
    tag: 'Step 5',
  },
];

const About = () => {
  const user = useSelector((store) => store.user);
  const isAdmin   = user && user.emailId?.endsWith('@cargoxpress.com');
  const isTrader  = user && !isAdmin && user.aadharNumber !== undefined;
  const isCompany = user && !isAdmin && user.registrationNumber !== undefined;

  return (
    <section id="about" className="py-24 px-6 border-t border-border relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <span className="cx-eyebrow text-signal-emerald">Operational Flow</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink mt-3 mb-6 leading-tight tracking-tight">
              From onboarding<br />
              <span className="text-ink-subtle">to optimized dispatch in minutes.</span>
            </h2>
            <p className="text-ink-muted text-sm sm:text-base leading-relaxed mb-8 max-w-md">
              CargoXpress streamlines freight logistics by matching commercial vehicle capacity headroom with verified shipper consignments along compatible regional transit corridors.
            </p>

            {!user && (
              <Link to="/login">
                <button className="group inline-flex items-center gap-2 px-6 py-3 bg-signal-emerald hover:bg-emerald-400 text-canvas font-semibold rounded-lg transition-all shadow-subtle-card">
                  Get Started Free
                  <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                </button>
              </Link>
            )}
            {isTrader && (
              <Link to="/traderRequest">
                <button className="group inline-flex items-center gap-2 px-6 py-3 bg-signal-emerald hover:bg-emerald-400 text-canvas font-semibold rounded-lg transition-all shadow-subtle-card">
                  Request Delivery <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </Link>
            )}
            {isCompany && (
              <Link to="/truck">
                <button className="group inline-flex items-center gap-2 px-6 py-3 bg-signal-aqua hover:bg-cyan-400 text-canvas font-semibold rounded-lg transition-all shadow-subtle-card">
                  Manage Fleet <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin">
                <button className="group inline-flex items-center gap-2 px-6 py-3 bg-signal-aqua hover:bg-cyan-400 text-canvas font-semibold rounded-lg transition-all shadow-subtle-card">
                  Dispatch Command <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </Link>
            )}
          </div>

          {/* Right — step list */}
          <div className="space-y-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === steps.length - 1;
              return (
                <div key={i} className="flex gap-4 group">
                  {/* connector column */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center flex-shrink-0 group-hover:border-signal-emerald transition-all shadow-sm">
                      <Icon className="h-4 w-4 text-signal-emerald" />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-border my-2" />}
                  </div>
                  {/* content */}
                  <div className="pb-8">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-signal-emerald/80 font-semibold">{step.tag}</span>
                    <h3 className="text-ink font-semibold text-base mt-0.5 mb-1">{step.label}</h3>
                    <p className="text-ink-muted text-xs sm:text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
