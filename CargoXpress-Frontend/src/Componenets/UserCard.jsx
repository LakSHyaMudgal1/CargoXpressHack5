import { Mail, MapPin, Hash, Building2, ShieldCheck } from "lucide-react";
import Badge from "../components/ui/Badge";

const UserProfileCard = ({ user }) => {
  const { name, emailId, photoUrl, address, registrationNumber, aadharNumber } = user;
  const isTrader = aadharNumber !== undefined;

  return (
    <div className="rounded-lg bg-surface border border-border overflow-hidden shadow-subtle-card">
      {/* Top Banner & Avatar */}
      <div className="h-16 bg-surface-elevated border-b border-border/60 relative">
        <div className="absolute -bottom-8 left-6">
          <div className="w-16 h-16 rounded-lg border-2 border-border-strong overflow-hidden bg-surface-base shadow-sm">
            <img
              src={photoUrl || "https://cdn-icons-png.flaticon.com/256/149/149071.png"}
              alt={name ? `${name}'s profile photo` : "User profile photo"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "https://cdn-icons-png.flaticon.com/256/149/149071.png";
              }}
            />
          </div>
        </div>
      </div>

      <div className="pt-10 p-5 space-y-4">
        {/* Name & Role */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-ink leading-tight">
              {name || "Account User"}
            </h3>
            <span className="text-[11px] font-mono text-ink-subtle block mt-0.5">
              {isTrader ? "Commodity Consignor" : "Commercial Transport Carrier"}
            </span>
          </div>
          <Badge variant={isTrader ? "emerald" : "aqua"} size="sm" dot>
            {isTrader ? "Trader" : "Carrier"}
          </Badge>
        </div>

        {/* Details Table */}
        <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
          <div className="flex items-center gap-2.5 text-ink-muted">
            <Mail className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
            <span className="font-mono text-xs text-ink truncate" title={emailId}>
              {emailId || "—"}
            </span>
          </div>

          {isTrader ? (
            <div className="flex items-center gap-2.5 text-ink-muted">
              <Hash className="w-3.5 h-3.5 text-signal-emerald shrink-0" />
              <span className="font-mono text-xs text-ink">
                UIDAI: {aadharNumber ? `****-****-${String(aadharNumber).slice(-4)}` : "—"}
              </span>
            </div>
          ) : (
            <>
              {address && (
                <div className="flex items-center gap-2.5 text-ink-muted">
                  <MapPin className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
                  <span className="text-xs text-ink truncate" title={address}>
                    {address}
                  </span>
                </div>
              )}
              {registrationNumber && (
                <div className="flex items-center gap-2.5 text-ink-muted">
                  <Building2 className="w-3.5 h-3.5 text-signal-aqua shrink-0" />
                  <span className="font-mono text-xs text-ink">
                    Reg: {registrationNumber}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Verification Footer */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-ink-subtle">
          <span className="flex items-center gap-1.5 text-signal-emerald">
            <ShieldCheck className="w-3.5 h-3.5" />
            Enterprise Verified
          </span>
          <span className="font-mono text-[10px] uppercase">Active Session</span>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
