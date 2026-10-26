import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { locationService } from '../services/locationService';
import { LocationPoint } from '../types/location';

interface TrackingCardProps {
  tripId: string;
  truckId: string;
  truckLicensePlate?: string;
  origin?: string;
  destination?: string;
}

export const TrackingCard: React.FC<TrackingCardProps> = ({
  tripId,
  truckId,
  truckLicensePlate,
  origin,
  destination,
}) => {
  const [isTracking, setIsTracking] = useState<boolean>(locationService.isTracking());
  const [isBackground, setIsBackground] = useState<boolean>(locationService.isBackground());
  const [allowBackground, setAllowBackground] = useState<boolean>(true);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(
    locationService.getLastLocation()
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [queuedPoints, setQueuedPoints] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Sync state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTracking(locationService.isTracking());
      setIsBackground(locationService.isBackground());
      setQueuedPoints(locationService.getQueuedCount());
      const last = locationService.getLastLocation();
      if (last) setCurrentLocation(last);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleStartTracking = async () => {
    setLoading(true);
    setPermissionError(null);

    try {
      const res = await locationService.startTracking({
        tripId,
        truckId,
        enableBackground: allowBackground,
        onLocation: (loc) => {
          setCurrentLocation(loc);
          setQueuedPoints(locationService.getQueuedCount());
        },
      });

      if (!res.success) {
        setPermissionError(res.message);
        Alert.alert('Location Permission Required', res.message);
      } else {
        setIsTracking(true);
        setIsBackground(res.backgroundActive);
      }
    } catch (err: any) {
      setPermissionError(err.message || 'Failed to start GPS tracking.');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTracking = async () => {
    Alert.alert(
      'Stop GPS Tracking',
      'Are you sure you want to stop location tracking for this active trip? Central dispatch will lose your live position.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Tracking',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await locationService.stopTracking();
              setIsTracking(false);
              setIsBackground(false);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const speedKmh = currentLocation?.speed ? Math.round(currentLocation.speed * 3.6) : 0;

  return (
    <Card variant="elevated" style={styles.card}>
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons
            name={isTracking ? 'radio-outline' : 'navigate-circle-outline'}
            size={22}
            color={isTracking ? THEME.colors.success : THEME.colors.primaryLight}
          />
          <Text style={styles.title}>GPS Live Fleet Tracking</Text>
        </View>

        {isTracking ? (
          <Badge
            label={isBackground ? 'LIVE & BACKGROUND' : 'FOREGROUND ONLY'}
            variant={isBackground ? 'success' : 'primary'}
            size="small"
          />
        ) : (
          <Badge label="TRACKING OFF" variant="neutral" size="small" />
        )}
      </View>

      {/* User-facing Permission Explanation & Transparency */}
      <View style={styles.explanationBox}>
        <Ionicons name="shield-checkmark" size={16} color={THEME.colors.info} />
        <Text style={styles.explanationText}>
          CargoXpress records GPS coordinates exclusively during your authorized active delivery hauls to provide real-time corridor monitoring and arrival verification for central logistics coordinators.
        </Text>
      </View>

      {permissionError && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={THEME.colors.danger} />
          <Text style={styles.errorText}>{permissionError}</Text>
        </View>
      )}

      {/* Telemetry Display Grid */}
      {isTracking && currentLocation && (
        <View style={styles.telemetryGrid}>
          {/* Coordinates Block */}
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryLabel}>COORDINATES</Text>
            <Text style={styles.telemetryValue}>
              {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
            </Text>
          </View>

          {/* Accuracy Block */}
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryLabel}>GPS ACCURACY</Text>
            <Text style={styles.telemetryValue}>
              {currentLocation.accuracy ? `±${currentLocation.accuracy}m` : 'Normal'}
            </Text>
          </View>

          {/* Speed Block */}
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryLabel}>TRANSIT SPEED</Text>
            <Text style={styles.telemetryValue}>{speedKmh} km/h</Text>
          </View>

          {/* Last Heartbeat */}
          <View style={styles.telemetryItem}>
            <Text style={styles.telemetryLabel}>LAST SIGNAL</Text>
            <Text style={styles.telemetryValue}>
              {new Date(currentLocation.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </Text>
          </View>
        </View>
      )}

      {/* Offline Queuing Notice */}
      {queuedPoints > 0 && (
        <View style={styles.queuedBanner}>
          <Ionicons name="cloud-offline" size={16} color={THEME.colors.warning} />
          <Text style={styles.queuedText}>
            {queuedPoints} location fix(es) buffered offline. Automatically uploading when cellular coverage returns.
          </Text>
        </View>
      )}

      {/* Background tracking explanation banner */}
      {isTracking && isBackground && (
        <View style={styles.backgroundActiveBanner}>
          <Ionicons name="notifications-outline" size={16} color={THEME.colors.success} />
          <Text style={styles.backgroundActiveText}>
            Background location active: Delivery progress continues updating even when device is locked or navigation apps are open.
          </Text>
        </View>
      )}

      {/* Background Toggle Option (when not tracking) */}
      {!isTracking && (
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleTitle}>Enable Background Location</Text>
            <Text style={styles.toggleSubtitle}>
              Keeps GPS broadcasting while using navigation or when the phone screen is off.
            </Text>
          </View>
          <Switch
            value={allowBackground}
            onValueChange={setAllowBackground}
            trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryDark }}
            thumbColor={allowBackground ? THEME.colors.primaryLight : THEME.colors.textMuted}
          />
        </View>
      )}

      {/* Action Controls */}
      <View style={styles.actionRow}>
        {isTracking ? (
          <Button
            title="Stop Trip Tracking"
            variant="danger"
            onPress={handleStopTracking}
            loading={loading}
            icon={<Ionicons name="stop-circle-outline" size={18} color={THEME.colors.white} style={{ marginRight: 6 }} />}
          />
        ) : (
          <Button
            title="Start GPS Tracking"
            variant="primary"
            onPress={handleStartTracking}
            loading={loading}
            icon={<Ionicons name="navigate-outline" size={18} color={THEME.colors.white} style={{ marginRight: 6 }} />}
          />
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: THEME.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...THEME.typography.titleSmall,
    color: THEME.colors.text,
    fontSize: 16,
  },
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  explanationText: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.dangerBg,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    gap: 8,
  },
  errorText: {
    ...THEME.typography.caption,
    color: THEME.colors.danger,
    flex: 1,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  telemetryItem: {
    width: '48%',
    gap: 2,
  },
  telemetryLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
    fontSize: 10,
  },
  telemetryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  queuedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.warningBg,
    borderRadius: THEME.borderRadius.sm,
    padding: THEME.spacing.sm,
    gap: 8,
  },
  queuedText: {
    ...THEME.typography.caption,
    color: THEME.colors.warning,
    flex: 1,
  },
  backgroundActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.successBg,
    borderRadius: THEME.borderRadius.sm,
    padding: THEME.spacing.sm,
    gap: 8,
  },
  backgroundActiveText: {
    ...THEME.typography.caption,
    color: THEME.colors.success,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.xs,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: THEME.spacing.md,
  },
  toggleTitle: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.text,
    fontWeight: '600',
  },
  toggleSubtitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  actionRow: {
    marginTop: THEME.spacing.xs,
  },
});
