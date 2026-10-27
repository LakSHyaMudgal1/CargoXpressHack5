import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { CheckCircle, XCircle, Clock, Truck, Package } from 'lucide-react';

/**
 * ActivityFeed
 * Displays real-time operational activity entries.
 *
 * @param {Array} events - [{ id, type, title, subtitle, timestamp, status, badgeVariant, icon }]
 * @param {string} title - Section title
 * @param {string} emptyText - Text when no events exist
 */
const ActivityFeed = ({
  events = [],
  title = "Recent Operational Activity",
  subtitle = "Live dispatch actions and merge decisions",
  emptyText = "No operational events recorded yet."
}) => {
  const getEventIcon = (type, status) => {
    if (type === 'merge_decision') {
      return status === 'accepted' ? CheckCircle : XCircle;
    }
    if (type === 'shipment') {
      return Package;
    }
    return Truck;
  };

  const getStatusBadgeVariant = (status) => {
    if (status === 'accepted' || status === 'completed' || status === 'delivered') return 'emerald';
    if (status === 'rejected' || status === 'failed' || status === 'delivery_failed') return 'coral';
    if (status === 'in_transit' || status === 'in_progress') return 'aqua';
    if (status === 'pending' || status === 'awaiting_assignment') return 'amber';
    return 'neutral';
  };

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    try {
      const date = new Date(ts);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        <Badge variant="aqua" size="sm">{events.length} Events</Badge>
      </div>

      {events.length === 0 ? (
        <div className="py-8 text-center text-xs text-ink-subtle">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {events.slice(0, 8).map((evt, idx) => {
            const Icon = evt.icon || getEventIcon(evt.type, evt.status);
            const badgeVariant = evt.badgeVariant || getStatusBadgeVariant(evt.status);

            return (
              <div
                key={evt.id || idx}
                className="flex items-start gap-3 p-3 rounded-xl bg-surface/50 border border-border/60 hover:border-border transition-colors text-xs"
              >
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  evt.status === 'accepted' || evt.status === 'completed'
                    ? 'bg-signal-emerald/10 text-signal-emerald'
                    : evt.status === 'rejected' || evt.status === 'failed'
                    ? 'bg-signal-coral/10 text-signal-coral'
                    : 'bg-signal-aqua/10 text-signal-aqua'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink truncate">{evt.title}</p>
                    {evt.status && (
                      <Badge variant={badgeVariant} size="sm">
                        {evt.status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  {evt.subtitle && (
                    <p className="text-ink-muted text-[11px] mt-0.5 line-clamp-2">
                      {evt.subtitle}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-ink-subtle mt-1.5 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(evt.timestamp)}</span>
                    {evt.actor && (
                      <span className="truncate">• By {evt.actor}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ActivityFeed;
