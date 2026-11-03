import React, { useState } from 'react';
import { Mail, User, Send, Phone, MapPin, MessageSquare, CheckCircle2 } from 'lucide-react';
import { contactData } from '../utils/contact';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';

const ContactUs = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('carrier');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState(null);
  const [error, setError] = useState('');

  const { showToast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide your name or organization.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid business email address.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setError('Please describe your inquiry (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    // Simulate real transmission acknowledgment
    setTimeout(() => {
      setIsSubmitting(false);
      const refCode = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedRef(refCode);
      showToast(
        'success',
        'Inquiry Transmitted',
        `Transmission logged with reference ${refCode}. The central dispatch desk will review your inquiry.`
      );
    }, 600);
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setMessage('');
    setSubmittedRef(null);
    setError('');
  };

  return (
    <section id="contact" className="py-24 px-6 border-t border-border relative overflow-hidden bg-surface-base/30">
      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        {/* Heading */}
        <div className="max-w-3xl space-y-2">
          <span className="cx-eyebrow text-signal-aqua">Direct Inquiries</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink leading-tight tracking-tight">
            Connect with Central Dispatch.
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Have questions regarding corridor routing, fleet capacity onboarding, or enterprise consignments? Our logistics desk is available to assist.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Info cards (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {contactData.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-5 rounded-xl bg-surface/80 border border-border hover:border-border-strong hover:bg-surface-elevated/70 transition-all shadow-subtle-card"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
                  {i === 0 ? (
                    <Phone className="w-4 h-4 text-signal-emerald" />
                  ) : i === 1 ? (
                    <Mail className="w-4 h-4 text-signal-aqua" />
                  ) : (
                    <MapPin className="w-4 h-4 text-signal-purple" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm text-ink mb-0.5">{item.title}</p>
                  <p className="text-xs text-ink-muted mb-2">{item.description}</p>
                  {item.phone && <p className="text-xs font-mono text-signal-emerald">{item.phone}</p>}
                  {item.email && <p className="text-xs font-mono text-signal-aqua">{item.email}</p>}
                </div>
              </div>
            ))}

            {/* Operations Support Note */}
            <div className="p-5 rounded-xl bg-surface-elevated/60 border border-border space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-signal-aqua" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
                  24/7 Operations Desk
                </span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Platform dispatchers monitor active corridor manifests around the clock to support carrier reassignments and consignor delivery queries.
              </p>
            </div>
          </div>

          {/* Form (Right 3 cols) */}
          <div className="lg:col-span-3 p-6 sm:p-8 rounded-xl bg-surface/80 border border-border shadow-subtle-card">
            {submittedRef ? (
              <div className="py-8 text-center space-y-4 animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-full bg-signal-emerald/15 border border-signal-emerald/30 text-signal-emerald mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base sm:text-lg font-bold text-ink">
                    Transmission Dispatched
                  </h4>
                  <p className="text-xs font-mono text-signal-aqua">
                    Reference ID: {submittedRef}
                  </p>
                </div>
                <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
                  Your inquiry has been logged with the dispatch desk. A team coordinator will review your route requirements and reply via email.
                </p>
                <div className="pt-2">
                  <Button variant="secondary" size="sm" onClick={handleReset}>
                    Send Another Transmission
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <h3 className="text-base font-bold text-ink">
                    Transmit Direct Logistics Inquiry
                  </h3>
                  <span className="text-[10px] font-mono text-ink-subtle uppercase">
                    Direct Channel
                  </span>
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-signal-coral/10 border border-signal-coral/30 text-signal-coral text-xs">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-ink-muted mb-1.5 uppercase tracking-wider font-semibold">
                      Your Name / Company
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full bg-surface-elevated/90 border border-border text-ink placeholder:text-ink-subtle rounded-md py-2 pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-ink-muted mb-1.5 uppercase tracking-wider font-semibold">
                      Business Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. ramesh@logistics.com"
                        className="w-full bg-surface-elevated/90 border border-border text-ink placeholder:text-ink-subtle rounded-md py-2 pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-ink-muted mb-1.5 uppercase tracking-wider font-semibold">
                    Inquiry Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'carrier', label: 'Fleet Carrier' },
                      { id: 'trader', label: 'Consignor Shipper' },
                      { id: 'dispatch', label: 'Dispatch Query' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRole(opt.id)}
                        className={`py-1.5 px-3 rounded-md text-xs font-mono transition-all border text-center select-none ${
                          role === opt.id
                            ? 'bg-signal-aqua/15 text-signal-aqua border-signal-aqua/30 font-semibold shadow-sm'
                            : 'bg-surface-elevated text-ink-muted border-border hover:text-ink'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-ink-muted mb-1.5 uppercase tracking-wider font-semibold">
                    Consignment or Fleet Details
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details on typical freight corridors, capacity requirements, or questions regarding algorithm consolidation..."
                    className="w-full bg-surface-elevated/90 border border-border text-ink placeholder:text-ink-subtle rounded-md p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-signal-aqua/80 transition-all resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  leftIcon={Send}
                  className="w-full"
                >
                  Transmit Message to Dispatch
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
