import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight, Truck, TrendingDown, Clock, GitMerge } from 'lucide-react';

const HeroSection = () => {
  const user = useSelector((store) => store.user);
  const isAdmin   = user && user.emailId?.endsWith('@cargoxpress.com');
  const isTrader  = user && !isAdmin && user.aadharNumber !== undefined;
  const isCompany = user && !isAdmin && user.registrationNumber !== undefined;

  const stats = [
    { icon: TrendingDown, value: '40%', label: 'Cost Reduction' },
    { icon: Clock,        value: '99%', label: 'On-Time Rate' },
    { icon: GitMerge,     value: '500+', label: 'Routes Merged' },
    { icon: Truck,        value: '200+', label: 'Active Trucks' },
  ];

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Radial glow — hero-specific, on top of the shared canvas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.10),transparent)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/4 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/4 rounded-full blur-3xl pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-6 w-full py-20">
          <div className="max-w-4xl">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">Smart Logistics Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-6xl md:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
              Ship smarter.<br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Cut costs. Scale fast.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/50 max-w-2xl leading-relaxed mb-10">
              CargoXpress connects transport companies and traders on one intelligent platform — automatically merging compatible shipments to eliminate empty miles and slash logistics costs.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-16">
              {!user && (
                <>
                  <Link to="/login">
                    <button className="group flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 hover:-translate-y-0.5">
                      Get Started Free
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </Link>
                  <button
                    onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-6 py-3 text-white/70 hover:text-white font-semibold rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
                  >
                    How it Works
                  </button>
                </>
              )}
              {isCompany && (
                <>
                  <Link to="/truck">
                    <button className="group flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5">
                      <Truck className="h-4 w-4" /> Add Truck
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </Link>
                  <Link to="/route">
                    <button className="px-6 py-3 text-white/70 hover:text-white font-semibold rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
                      Add Route
                    </button>
                  </Link>
                </>
              )}
              {isTrader && (
                <Link to="/traderRequest">
                  <button className="group flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5">
                    Request Delivery <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin">
                  <button className="group flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5">
                    Open Dashboard <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </Link>
              )}
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-white/3 border border-white/5 backdrop-blur-sm hover:bg-white/5 transition-all">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white leading-none">{value}</p>
                    <p className="text-xs text-white/40 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-950 to-transparent" />
    </section>
  );
};

export default HeroSection;
