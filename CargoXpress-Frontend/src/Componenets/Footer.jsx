import { Twitter, Youtube, Github, Truck, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const FooterSec = () => {
  const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <footer className="bg-gray-950 border-t border-white/5 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

          {/* Brand */}
          <div>
            <Link to="/" className="inline-block text-2xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Cargo</span>
              <span className="text-white">Xpress</span>
            </Link>
            <p className="text-white/30 text-sm leading-relaxed mb-5">
              Intelligent logistics platform connecting transport companies and traders across India.
            </p>
            <div className="flex gap-3">
              {[
                { href: 'https://twitter.com', Icon: Twitter, hover: 'hover:bg-sky-500' },
                { href: 'https://youtube.com', Icon: Youtube, hover: 'hover:bg-red-500' },
                { href: 'https://github.com',  Icon: Github,  hover: 'hover:bg-white hover:text-gray-900' },
              ].map(({ href, Icon, hover }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                  className={`w-9 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all ${hover}`}>
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-5">Product</p>
            <ul className="space-y-3">
              {[
                { label: 'How it Works',   action: () => scroll('about') },
                { label: 'Features',       action: () => scroll('feature') },
                { label: 'Schedule Delivery', href: '/truck' },
                { label: 'Request Delivery',  href: '/traderRequest' },
              ].map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <Link to={item.href} className="text-sm text-white/40 hover:text-white transition-colors">{item.label}</Link>
                  ) : (
                    <button onClick={item.action} className="text-sm text-white/40 hover:text-white transition-colors text-left">{item.label}</button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-5">Company</p>
            <ul className="space-y-3">
              {['About Us', 'Privacy Policy', 'Terms of Service'].map((label) => (
                <li key={label}>
                  <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-5">Contact</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-white/40">IIIT Una, Himachal Pradesh</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-white/40">+91 73404-39674</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <a href="mailto:Admin@RuntimeTerror.com" className="text-sm text-white/40 hover:text-white transition-colors">
                  Admin@RuntimeTerror.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/20">
            © {new Date().getFullYear()} CargoXpress · Built by RunTime Terror
          </p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/20 ml-1">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSec;
