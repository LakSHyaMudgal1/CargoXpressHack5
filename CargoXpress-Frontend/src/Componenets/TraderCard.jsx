import React from 'react';
import { Hash, Mail, ShieldCheck } from 'lucide-react';
import Badge from '../components/ui/Badge';

/**
 * CargoXpress Trader Card
 * Clean hairline borders, tabular Aadhaar ID, and verified consignor badge.
 */
const TraderCard = ({ name, emailId, photoUrl, aadharNumber }) => {
  return (
    <div className="group rounded-xl bg-surface/90 border border-border hover:border-border-strong hover:bg-surface-elevated/80 transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-subtle-card">
      <div className="p-5">
        {/* Header with Avatar & Badge */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-border shrink-0 flex items-center justify-center text-signal-emerald font-bold text-sm">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span>{(name || 'T').charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink group-hover:text-signal-emerald transition-colors truncate">
                {name}
              </h3>
              <p className="text-[11px] font-mono text-ink-subtle truncate">
                Consignor
              </p>
            </div>
          </div>

          <Badge variant="emerald" size="sm" className="font-mono text-[10px] uppercase">
            Active
          </Badge>
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-xs text-ink-muted pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-signal-emerald/70 shrink-0" />
            <span className="font-mono tabular-nums text-ink-secondary">
              {aadharNumber ? `UIDAI: ****-****-${String(aadharNumber).slice(-4)}` : 'ID-PENDING'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
            <a
              href={`mailto:${emailId}`}
              className="text-signal-emerald/90 hover:underline truncate"
              title={emailId}
            >
              {emailId}
            </a>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border/60 bg-surface-subtle/40 flex items-center justify-between text-xs text-ink-subtle">
        <span className="flex items-center gap-1.5 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-signal-emerald" /> Identity Verified
        </span>
        <span className="font-mono text-[10px] uppercase">KYC Pass</span>
      </div>
    </div>
  );
};

export default TraderCard;
