import { Mail, User, Send, Phone, MapPin, MessageSquare } from 'lucide-react';
import { contactData } from '../utils/contact';

const ContactUs = () => (
  <section id="contact" className="py-24 px-6 border-t border-border relative overflow-hidden">
    <div className="max-w-6xl mx-auto relative z-10">

      {/* Heading */}
      <div className="mb-14">
        <span className="cx-eyebrow text-signal-aqua">Direct Inquiries</span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink mt-3 leading-tight tracking-tight">
          Connect with dispatch.<br />
          <span className="text-ink-subtle">Our logistics desk is on standby.</span>
        </h2>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">

        {/* Info cards */}
        <div className="lg:col-span-2 space-y-4">
          {contactData.map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-surface/80 border border-border hover:border-border-strong hover:bg-surface-elevated/70 transition-all shadow-subtle-card">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
                {i === 0 ? <Phone className="w-4 h-4 text-signal-emerald" />
                : i === 1 ? <Mail  className="w-4 h-4 text-signal-aqua" />
                :           <MapPin className="w-4 h-4 text-signal-purple" />}
              </div>
              <div>
                <p className="font-semibold text-sm text-ink mb-0.5">{item.title}</p>
                <p className="text-xs text-ink-muted mb-2">{item.description}</p>
                {item.phone && <p className="text-xs font-mono text-signal-emerald">{item.phone}</p>}
                {item.email && <p className="text-xs font-mono text-signal-aqua">{item.email}</p>}
              </div>
            </div>
          ))}

          {/* quick note */}
          <div className="p-5 rounded-xl bg-surface-elevated/60 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-signal-aqua" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">24/7 Operations Support</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Our central dispatch desk is available around the clock to support carrier fleet adjustments and consignor booking queries.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3 p-6 sm:p-8 rounded-xl bg-surface/80 border border-border shadow-subtle-card">
          <h3 className="text-lg font-semibold text-ink mb-6">Send Transmission</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-ink-muted mb-1.5 uppercase tracking-wider font-semibold">Your Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                <input type="text" placeholder="e.g. John Doe"
                  className="w-full bg-surface-base border border-border text-ink placeholder:text-ink-subtle rounded-lg py-2.5 pl-10 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-signal-aqua transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-ink-muted mb-1.5 uppercase tracking-wider font-semibold">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                <input type="email" placeholder="you@carrier.com"
                  className="w-full bg-surface-base border border-border text-ink placeholder:text-ink-subtle rounded-lg py-2.5 pl-10 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-signal-aqua transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-ink-muted mb-1.5 uppercase tracking-wider font-semibold">Message</label>
              <textarea rows={4} placeholder="Describe your fleet or consignment inquiry..."
                className="w-full bg-surface-base border border-border text-ink placeholder:text-ink-subtle rounded-lg py-2.5 px-4 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-signal-aqua transition-all resize-none" />
            </div>
            <button className="w-full flex items-center justify-center gap-2 py-3 bg-signal-aqua hover:bg-cyan-400 text-canvas font-semibold rounded-lg transition-all shadow-subtle-card text-xs sm:text-sm">
              <Send className="h-4 w-4" /> Send Inquiry
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default ContactUs;
