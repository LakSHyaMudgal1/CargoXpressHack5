import { Mail, User, Send, Phone, MapPin, MessageSquare } from 'lucide-react';
import { contactData } from '../utils/contact';

const ContactUs = () => (
  <section id="contact" className="py-28 px-6 relative overflow-hidden">
    <div className="absolute left-0 bottom-0 w-[400px] h-[400px] bg-cyan-500/3 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

    <div className="max-w-6xl mx-auto relative z-10">

      {/* Heading */}
      <div className="mb-16">
        <span className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">Contact</span>
        <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 leading-tight">
          Get in touch.<br />
          <span className="text-white/30">We respond fast.</span>
        </h2>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">

        {/* Info cards */}
        <div className="lg:col-span-2 space-y-4">
          {contactData.map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                {i === 0 ? <Phone className="w-4 h-4 text-emerald-400" />
                : i === 1 ? <Mail  className="w-4 h-4 text-emerald-400" />
                :           <MapPin className="w-4 h-4 text-emerald-400" />}
              </div>
              <div>
                <p className="font-semibold text-sm text-white mb-0.5">{item.title}</p>
                <p className="text-xs text-white/30 mb-2">{item.description}</p>
                {item.phone && <p className="text-sm text-emerald-400 font-medium">{item.phone}</p>}
                {item.email && <p className="text-sm text-white/40">{item.email}</p>}
              </div>
            </div>
          ))}

          {/* quick note */}
          <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">24/7 Support</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Our team is always available to help you with any queries related to routes, trucks, or merges.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3 p-8 rounded-2xl bg-white/3 border border-white/5">
          <h3 className="text-xl font-semibold text-white mb-6">Send us a Message</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Your Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <input type="text" placeholder="John Doe"
                  className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/7 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <input type="email" placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/7 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Message</label>
              <textarea rows={5} placeholder="How can we help you?"
                className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/7 transition-all resize-none" />
            </div>
            <button className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5">
              <Send className="h-4 w-4" /> Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default ContactUs;
