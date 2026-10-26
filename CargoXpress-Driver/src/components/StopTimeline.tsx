import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  // If rich stops are provided, render enhanced operational stop list
  if (richStops && richStops.length > 0) {
    return (
      <View style={styles.container}>
        {richStops.map((stop, index) => {
          const isFirst = index === 0;
          const isLast = index === richStops.length - 1;
          const isCompleted = stop.isCompleted;
          const isFailed = stop.isFailed;
          const isActive = stop.isActive;

          const getStatusBadgeVariant = (status: StopStatus) => {
            switch (status) {
              case 'completed': return 'success';
              case 'in_progress': return 'primary';
              case 'arrived': return 'warning';
              case 'en_route': return 'info';
              case 'failed': return 'danger';
              default: return 'neutral';
            }
          };

          const formatTimestamp = (ts?: string | null) => {
            if (!ts) return null;
            const d = new Date(ts);
            return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          };

          return (
            <TouchableOpacity
              key={`${stop.stopName}-${index}`}
              style={[
                styles.richStopCard,
                isActive && styles.activeStopCard,
                isCompleted && styles.completedStopCard,
                isFailed && styles.failedStopCard,
              ]}
              activeOpacity={onSelectStop ? 0.7 : 1}
              onPress={() => onSelectStop && onSelectStop(stop.stopIndex, stop.stopName)}
            >
              <View style={styles.stopRow}>
                {/* Timeline node */}
                <View style={styles.nodeColumn}>
                  <View
                    style={[
                      styles.nodeCircle,
                      isCompleted && styles.completedCircle,
                      isActive && styles.activeCircle,
                      isFailed && styles.failedCircle,
                      isFirst && !isCompleted && styles.firstCircle,
                      isLast && !isCompleted && styles.lastCircle,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color={THEME.colors.white} />
                    ) : isFailed ? (
                      <Ionicons name="close" size={14} color={THEME.colors.white} />
                    ) : isActive ? (
                      <Ionicons name="radio-button-on" size={14} color={THEME.colors.primaryLight} />
                    ) : (
                      <Text style={styles.stepNumber}>{index + 1}</Text>
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
                  <View style={styles.stopHeader}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.stopTitleRow}>
                        <Text style={styles.stopNumberTag}>STOP #{index + 1}</Text>
                        <Badge
                          label={stop.stopType === 'pickup' ? 'PICKUP' : stop.stopType === 'delivery' ? 'DELIVERY' : stop.stopType === 'pickup_delivery' ? 'PICKUP & DELIVER' : 'WAYPOINT'}
                          variant={stop.stopType === 'delivery' ? 'warning' : 'neutral'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.stopName,
                          isActive && styles.activeStopName,
                          isCompleted && styles.completedStopName,
                        ]}
                      >
                        {stop.stopName}
                      </Text>
                    </View>

                    <Badge
                      label={stop.status.toUpperCase().replace('_', ' ')}
                      variant={getStatusBadgeVariant(stop.status)}
                    />
                  </View>

                  {/* Shipment references and weight */}
                  {stop.shipments && stop.shipments.length > 0 && (
                    <View style={styles.shipmentSummaryRow}>
                      <Ionicons name="cube-outline" size={13} color={THEME.colors.textMuted} />
                      <Text style={styles.shipmentSummaryText}>
                        {stop.shipments.map(s => `${s.reference} (${s.weightKg}kg)`).join(', ')}
                      </Text>
                    </View>
                  )}

                  {/* Timestamps & actions link */}
                  <View style={styles.bottomMetaRow}>
                    <Text style={styles.timestampMeta}>
                      {isCompleted && stop.completedAt
                        ? `Completed at ${formatTimestamp(stop.completedAt)}`
                        : stop.arrivedAt
                        ? `Arrived at ${formatTimestamp(stop.arrivedAt)}`
                        : `Updated ${formatTimestamp(stop.lastUpdatedAt)}`}
                    </Text>

                    {onSelectStop && (
                      <View style={styles.actionPrompt}>
                        <Text style={styles.actionPromptText}>
                          {isCompleted ? 'View Details' : 'Manage Stop'}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={THEME.colors.primaryLight} />
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

  // Fallback to basic string list if richStops not provided
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

        const load = currentLoads && currentLoads[index] !== undefined ? currentLoads[index] : null;
        const remaining =
          remainingLoads && remainingLoads[index] !== undefined ? remainingLoads[index] : null;

        return (
          <View key={`${stop}-${index}`} style={styles.stopRow}>
            {/* Timeline node & connector */}
            <View style={styles.nodeColumn}>
              <View
                style={[
                  styles.nodeCircle,
                  isFirst && styles.firstCircle,
                  isLast && styles.lastCircle,
                  isNext && styles.nextCircle,
                  isCompleted && styles.completedCircle,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={12} color={THEME.colors.white} />
                ) : isFirst ? (
                  <Ionicons name="radio-button-on" size={12} color={THEME.colors.primaryLight} />
                ) : isLast ? (
                  <Ionicons name="location" size={14} color={THEME.colors.secondary} />
                ) : (
                  <Text style={styles.stepNumber}>{index + 1}</Text>
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
              <View style={styles.stopHeader}>
                <Text
                  style={[
                    styles.stopName,
                    isNext && styles.nextStopName,
                    isCompleted && styles.completedStopName,
                  ]}
                >
                  {stop}
                </Text>
                {isFirst && <Text style={styles.typeTag}>ORIGIN</Text>}
                {isLast && <Text style={[styles.typeTag, styles.destTag]}>DESTINATION</Text>}
                {isNext && !isFirst && !isLast && (
                  <Text style={[styles.typeTag, styles.nextTag]}>NEXT STOP</Text>
                )}
              </View>

              {(load !== null || remaining !== null) && (
                <View style={styles.loadRow}>
                  {load !== null && (
                    <Text style={styles.loadText}>
                      Load: <Text style={styles.loadValue}>{load.toLocaleString()} kg</Text>
                    </Text>
                  )}
                  {remaining !== null && (
                    <Text style={styles.loadText}>
                      Headroom: <Text style={styles.headroomValue}>{remaining.toLocaleString()} kg</Text>
                    </Text>
                  )}
                </View>
              )}
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
    gap: THEME.spacing.sm,
  },
  emptyContainer: {
    padding: THEME.spacing.md,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  richStopCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.sm,
  },
  activeStopCard: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.04)',
  },
  completedStopCard: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  failedStopCard: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  stopRow: {
    flexDirection: 'row',
  },
  nodeColumn: {
    width: 32,
    alignItems: 'center',
    marginRight: 6,
  },
  nodeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.surfaceHover,
    borderWidth: 2,
    borderColor: THEME.colors.border,
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
  nextCircle: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: THEME.colors.primary,
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
  stepNumber: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 4,
  },
  completedConnectorLine: {
    backgroundColor: THEME.colors.success,
  },
  contentColumn: {
    flex: 1,
    gap: 4,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  stopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopNumberTag: {
    ...THEME.typography.badge,
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  stopName: {
    ...THEME.typography.bodyLarge,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  activeStopName: {
    color: THEME.colors.primaryLight,
  },
  completedStopName: {
    color: THEME.colors.textSecondary,
  },
  nextStopName: {
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  typeTag: {
    ...THEME.typography.badge,
    fontSize: 9.5,
    color: THEME.colors.primaryLight,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  destTag: {
    color: THEME.colors.secondary,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  nextTag: {
    color: THEME.colors.success,
    backgroundColor: THEME.colors.successBg,
  },
  shipmentSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  shipmentSummaryText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    flex: 1,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  timestampMeta: {
    ...THEME.typography.caption,
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionPromptText: {
    ...THEME.typography.caption,
    color: THEME.colors.primaryLight,
    fontWeight: '600',
  },
  loadRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: 4,
  },
  loadText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  loadValue: {
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  headroomValue: {
    color: THEME.colors.info,
    fontWeight: '600',
  },
});
