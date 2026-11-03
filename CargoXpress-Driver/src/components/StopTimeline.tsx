import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { StopItem, StopStatus, StopType } from '../types/stop';
import { Badge } from './Badge';

interface StopTimelineProps {
  stops?: string[];
  richStops?: StopItem[];
  currentLoads?: number[];
  remainingLoads?: number[];
  nextStopIndex?: number;
  onSelectStop?: (stopIndex: number, stopName: string) => void;
}

export const StopTimeline: React.FC<StopTimelineProps> = ({
  stops,
  richStops,
  currentLoads,
  remainingLoads,
  nextStopIndex = 1,
  onSelectStop,
}) => {
  const getStatusBadge = (status: StopStatus) => {
    switch (status) {
      case 'completed':
        return { label: 'COMPLETED', variant: 'success' as const };
      case 'in_progress':
        return { label: 'OPERATIONS ACTIVE', variant: 'primary' as const };
      case 'arrived':
        return { label: 'ARRIVED AT STOP', variant: 'warning' as const };
      case 'en_route':
        return { label: 'EN ROUTE', variant: 'info' as const };
      case 'failed':
        return { label: 'DELIVERY FAILED', variant: 'danger' as const };
      default:
        return { label: 'SCHEDULED', variant: 'neutral' as const };
    }
  };

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return null;
    const d = new Date(ts);
    return isNaN(d.getTime())
      ? null
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 1. If rich stops are provided, render operational timeline
  if (richStops && richStops.length > 0) {
    return (
      <View style={styles.container}>
        {richStops.map((stop, index) => {
          const isFirst = index === 0;
          const isLast = index === richStops.length - 1;
          const isCompleted = stop.isCompleted;
          const isFailed = stop.isFailed;
          const isActive = stop.isActive;
          const statusBadge = getStatusBadge(stop.status);

          let stopTypeLabel = 'TRANSIT HUB';
          let stopTypeVariant: 'primary' | 'warning' | 'info' | 'neutral' = 'neutral';

          if (stop.stopType === 'pickup') {
            stopTypeLabel = 'CARGO PICKUP';
            stopTypeVariant = 'primary';
          } else if (stop.stopType === 'delivery') {
            stopTypeLabel = 'CONSIGNMENT DELIVERY';
            stopTypeVariant = 'warning';
          } else if (stop.stopType === 'pickup_delivery') {
            stopTypeLabel = 'PICKUP & DELIVERY';
            stopTypeVariant = 'info';
          }

          return (
            <TouchableOpacity
              key={`${stop.stopName}-${index}`}
              style={[
                styles.richStopCard,
                isActive && styles.activeStopCard,
                isCompleted && styles.completedStopCard,
                isFailed && styles.failedStopCard,
              ]}
              activeOpacity={onSelectStop ? 0.75 : 1}
              onPress={() => onSelectStop && onSelectStop(stop.stopIndex, stop.stopName)}
            >
              {/* Active Banner for Current Stop */}
              {isActive && (
                <View style={styles.activeBanner}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeBannerText}>CURRENT OPERATIONAL STOP</Text>
                </View>
              )}

              <View style={styles.stopRow}>
                {/* Timeline node & connector column */}
                <View style={styles.nodeColumn}>
                  <View
                    style={[
                      styles.nodeCircle,
                      isCompleted && styles.completedCircle,
                      isActive && styles.activeCircle,
                      isFailed && styles.failedCircle,
                      isFirst && !isCompleted && !isActive && styles.firstCircle,
                      isLast && !isCompleted && !isActive && styles.lastCircle,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : isFailed ? (
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    ) : isActive ? (
                      <View style={styles.innerPulse} />
                    ) : (
                      <Text style={styles.stepNumber}>
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </Text>
                    )}
                  </View>

                  {!isLast && (
                    <View
                      style={[
                        styles.connectorLine,
                        isCompleted && styles.completedConnectorLine,
                      ]}
                    />
                  )}
                </View>

                {/* Stop content details */}
                <View style={styles.contentColumn}>
                  {/* Top metadata tags */}
                  <View style={styles.stopMetaHeader}>
                    <View style={styles.sequenceTagBox}>
                      <Text style={styles.sequenceTagText}>
                        STOP {index + 1} OF {richStops.length}
                      </Text>
                      <Badge label={stopTypeLabel} variant={stopTypeVariant} size="small" />
                    </View>

                    <Badge label={statusBadge.label} variant={statusBadge.variant} size="small" />
                  </View>

                  {/* City / Stop Location Title */}
                  <Text
                    style={[
                      styles.stopName,
                      isActive && styles.activeStopName,
                      isCompleted && styles.completedStopName,
                    ]}
                  >
                    {stop.stopName}
                  </Text>

                  {/* Associated Cargo / Shipment references */}
                  {stop.shipments && stop.shipments.length > 0 && (
                    <View style={styles.shipmentsContainer}>
                      <View style={styles.shipmentHeaderRow}>
                        <Ionicons name="cube" size={13} color={THEME.colors.primaryLight} />
                        <Text style={styles.shipmentCountText}>
                          {stop.shipments.length} Associated {stop.shipments.length === 1 ? 'Shipment' : 'Shipments'}:
                        </Text>
                      </View>

                      <View style={styles.shipmentPillWrap}>
                        {stop.shipments.map((s, sIdx) => (
                          <View key={`ship-${s.shipmentId || sIdx}`} style={styles.shipmentPill}>
                            <Text style={styles.shipmentRefText}>{s.reference}</Text>
                            <Text style={styles.shipmentWeightText}>{s.weightKg} kg</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Failure reason if delivery failed */}
                  {isFailed && stop.failureReason && (
                    <View style={styles.failureReasonBox}>
                      <Ionicons name="alert-circle" size={14} color={THEME.colors.danger} />
                      <Text style={styles.failureReasonText}>
                        Reason: {stop.failureReason}
                      </Text>
                    </View>
                  )}

                  {/* Footer Timestamps & Action Prompts */}
                  <View style={styles.bottomRow}>
                    <Text style={styles.timestampText}>
                      {isCompleted && stop.completedAt
                        ? `Finished: ${formatTimestamp(stop.completedAt)}`
                        : stop.arrivedAt
                        ? `Arrived: ${formatTimestamp(stop.arrivedAt)}`
                        : isFirst
                        ? 'Trip Origin'
                        : isLast
                        ? 'Final Destination'
                        : 'Scheduled Arrival'}
                    </Text>

                    {onSelectStop && (
                      <View style={styles.actionLink}>
                        <Text style={styles.actionLinkText}>
                          {isActive
                            ? 'Perform Actions'
                            : isCompleted
                            ? 'View POD Details'
                            : 'Open Stop'}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={isActive ? THEME.colors.primaryLight : THEME.colors.textMuted}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // 2. Fallback to basic string list if richStops not provided
  if (!stops || stops.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No stops defined for this route.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {stops.map((stop, index) => {
        const isFirst = index === 0;
        const isLast = index === stops.length - 1;
        const isNext = index === nextStopIndex;
        const isCompleted = index < nextStopIndex;

        const load =
          currentLoads && currentLoads[index] !== undefined ? currentLoads[index] : null;
        const remaining =
          remainingLoads && remainingLoads[index] !== undefined
            ? remainingLoads[index]
            : null;

        return (
          <View key={`${stop}-${index}`} style={styles.richStopCard}>
            <View style={styles.stopRow}>
              {/* Timeline node */}
              <View style={styles.nodeColumn}>
                <View
                  style={[
                    styles.nodeCircle,
                    isCompleted && styles.completedCircle,
                    isNext && styles.activeCircle,
                    isFirst && !isCompleted && !isNext && styles.firstCircle,
                    isLast && !isCompleted && !isNext && styles.lastCircle,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  ) : isFirst ? (
                    <Ionicons name="radio-button-on" size={12} color={THEME.colors.primaryLight} />
                  ) : isLast ? (
                    <Ionicons name="location" size={14} color={THEME.colors.secondary} />
                  ) : (
                    <Text style={styles.stepNumber}>
                      {index + 1 < 10 ? `0${index + 1}` : index + 1}
                    </Text>
                  )}
                </View>

                {!isLast && (
                  <View
                    style={[
                      styles.connectorLine,
                      isCompleted && styles.completedConnectorLine,
                    ]}
                  />
                )}
              </View>

              {/* Stop content */}
              <View style={styles.contentColumn}>
                <View style={styles.stopMetaHeader}>
                  <Text style={styles.sequenceTagText}>
                    STOP {index + 1} OF {stops.length}
                  </Text>
                  {isFirst && <Badge label="ORIGIN" variant="primary" size="small" />}
                  {isLast && <Badge label="DESTINATION" variant="warning" size="small" />}
                  {isNext && !isFirst && !isLast && (
                    <Badge label="NEXT STOP" variant="success" size="small" />
                  )}
                </View>

                <Text
                  style={[
                    styles.stopName,
                    isNext && styles.activeStopName,
                    isCompleted && styles.completedStopName,
                  ]}
                >
                  {stop}
                </Text>

                {(load !== null || remaining !== null) && (
                  <View style={styles.loadRow}>
                    {load !== null && (
                      <Text style={styles.loadText}>
                        Load: <Text style={styles.loadValue}>{load.toLocaleString()} kg</Text>
                      </Text>
                    )}
                    {remaining !== null && (
                      <Text style={styles.loadText}>
                        Headroom:{' '}
                        <Text style={styles.headroomValue}>
                          {remaining.toLocaleString()} kg
                        </Text>
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: THEME.spacing.sm,
    gap: 12,
  },
  emptyContainer: {
    padding: THEME.spacing.md,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  richStopCard: {
    backgroundColor: '#161F30',
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 10,
  },
  activeStopCard: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: '#17233B',
    borderWidth: 1.5,
    shadowColor: THEME.colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  completedStopCard: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  failedStopCard: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primaryLight,
  },
  activeBannerText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primaryLight,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  stopRow: {
    flexDirection: 'row',
  },
  nodeColumn: {
    width: 36,
    alignItems: 'center',
    marginRight: 10,
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  firstCircle: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
  },
  lastCircle: {
    borderColor: THEME.colors.secondary,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  activeCircle: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: THEME.colors.primary,
  },
  completedCircle: {
    borderColor: THEME.colors.success,
    backgroundColor: THEME.colors.success,
  },
  failedCircle: {
    borderColor: THEME.colors.danger,
    backgroundColor: THEME.colors.danger,
  },
  innerPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  stepNumber: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  completedConnectorLine: {
    backgroundColor: THEME.colors.success,
  },
  contentColumn: {
    flex: 1,
    gap: 6,
  },
  stopMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sequenceTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sequenceTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  stopName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  activeStopName: {
    color: THEME.colors.primaryLight,
  },
  completedStopName: {
    color: THEME.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  shipmentsContainer: {
    backgroundColor: '#0F172A',
    borderRadius: THEME.borderRadius.md,
    padding: 8,
    gap: 6,
    marginTop: 2,
  },
  shipmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shipmentCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  shipmentPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  shipmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  shipmentRefText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  shipmentWeightText: {
    fontSize: 10,
    color: THEME.colors.primaryLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  failureReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  failureReasonText: {
    fontSize: 11,
    color: THEME.colors.danger,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  timestampText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  loadRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: 4,
  },
  loadText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  loadValue: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headroomValue: {
    color: THEME.colors.info,
    fontWeight: '700',
  },
});

export default StopTimeline;
