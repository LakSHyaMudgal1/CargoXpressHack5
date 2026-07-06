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
    <section id="about" className="py-28 px-6 relative overflow-hidden">
      {/* background accent */}
      <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-emerald-500/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* Left — copy */}
          <div>
            <span className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">How it Works</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6 leading-tight">
              From signup<br />
              <span className="text-white/30">to dispatch in minutes.</span>
            </h2>
            <p className="text-white/40 text-base leading-relaxed mb-10 max-w-md">
              CargoXpress automates the hard part of logistics — finding trucks with spare capacity that match your route and cargo weight.
            </p>

            {!user && (
              <Link to="/login">
                <button className="group flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5">
                  Get Started Free
                  <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                </button>
              </Link>
            )}
            {isTrader && (
              <Link to="/traderRequest">
                <button className="group flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5">
                  Request a Delivery →
                </button>
              </Link>
            )}
            {isCompany && (
              <Link to="/truck">
                <button className="group flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5">
                  Add Your Truck →
                </button>
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin">
                <button className="group flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5">
                  Open Dashboard →
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
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-all">
                      <Icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-emerald-500/20 to-transparent my-2" />}
                  </div>
                  {/* content */}
                  <div className={`pb-8 ${isLast ? '' : ''}`}>
                    <span className="text-xs font-semibold text-emerald-500/60 tracking-wider">{step.tag}</span>
                    <h3 className="text-white font-semibold mt-0.5 mb-1">{step.label}</h3>
                    <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
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
