import React from 'react';
import { Building2, Hash, MapPin, Mail } from 'lucide-react';
import Badge from '../components/ui/Badge';

/**
 * CargoXpress Carrier Card
 * Clean hairline borders, tabular registration number, and clear contact points.
 */
const CompanyCard = ({ imageUrl, name, registrationNo, address, email }) => {
  return (
    <div className="group rounded-xl bg-surface/90 border border-border hover:border-border-strong hover:bg-surface-elevated/80 transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-subtle-card">
      <div>
        {/* Visual Banner */}
        <div className="relative w-full h-36 overflow-hidden bg-surface-subtle">
          <img
            src={imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80'}
            alt={`${name} facility`}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-300"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

          {/* Carrier Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="aqua" size="sm" className="font-mono text-[10px] uppercase tracking-wider backdrop-blur-md">
              Carrier Fleet
            </Badge>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-ink group-hover:text-signal-aqua transition-colors truncate">
              {name}
            </h3>
            <Building2 className="w-4 h-4 text-ink-subtle shrink-0 mt-0.5" />
          </div>

          <div className="space-y-2 text-xs text-ink-muted">
            {/* Registration Number */}
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-signal-aqua/70 shrink-0" />
              <span className="font-mono tabular-nums text-ink-secondary truncate">
                {registrationNo || 'REG-UNSPECIFIED'}
              </span>
            </div>

            {/* Address */}
            {address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-ink-subtle shrink-0 mt-0.5" />
                <span className="line-clamp-2 text-ink-subtle">
                  {address}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Contact */}
      <div className="p-4 border-t border-border/60 bg-surface-subtle/40 flex items-center justify-between text-xs">
        <a
          href={`mailto:${email}`}
          className="text-signal-aqua hover:underline flex items-center gap-1.5 truncate max-w-[200px]"
          title={email}
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{email}</span>
        </a>
        <span className="text-[10px] font-mono uppercase text-ink-subtle">
          Verified
        </span>
      </div>
    </div>
  );
};

export default CompanyCard;
