import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface StopTimelineProps {
  stops: string[];
  currentLoads?: number[];
  remainingLoads?: number[];
  nextStopIndex?: number;
}

export const StopTimeline: React.FC<StopTimelineProps> = ({
  stops,
  currentLoads,
  remainingLoads,
  nextStopIndex = 1,
}) => {
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
  },
  emptyContainer: {
    padding: THEME.spacing.md,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  stopRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  nodeColumn: {
    width: 32,
    alignItems: 'center',
  },
  nodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  completedCircle: {
    borderColor: THEME.colors.success,
    backgroundColor: THEME.colors.success,
  },
  stepNumber: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 2,
  },
  completedConnectorLine: {
    backgroundColor: THEME.colors.success,
  },
  contentColumn: {
    flex: 1,
    paddingLeft: THEME.spacing.sm,
    paddingBottom: THEME.spacing.md,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stopName: {
    ...THEME.typography.bodyLarge,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  nextStopName: {
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  completedStopName: {
    color: THEME.colors.textSecondary,
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
