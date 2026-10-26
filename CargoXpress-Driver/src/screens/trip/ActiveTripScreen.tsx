import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { tripApi } from '../../api/tripApi';
import { stopApi } from '../../api/stopApi';
import { THEME } from '../../constants/theme';
import { AppNavigationProp } from '../../navigation/types';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { StopTimeline } from '../../components/StopTimeline';
import { ManifestCard } from '../../components/ManifestCard';
import { TrackingCard } from '../../components/TrackingCard';
import { EmptyState } from '../../components/EmptyState';
import { ActiveTripResponse } from '../../types/trip';
import { TripStopsResponse } from '../../types/stop';

export const ActiveTripScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [tripData, setTripData] = useState<ActiveTripResponse | null>(null);
  const [stopsData, setStopsData] = useState<TripStopsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTrip = useCallback(async () => {
    setError(null);
    try {
      const [resTrip, resStops] = await Promise.all([
        tripApi.getActiveTrip(),
        stopApi.getActiveTripStops().catch(() => null),
      ]);
      setTripData(resTrip);
      if (resStops) {
        setStopsData(resStops);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load route schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveTrip();
  };

  const trip = tripData?.trip;
  const truck = tripData?.truck;
  const isMerged = trip?.type === 'MergedSchedule';

  // Calculate current maximum load along route
  const maxLoad = trip?.currentLoad && trip.currentLoad.length > 0 ? Math.max(...trip.currentLoad) : 0;
  const capacity = trip?.totalCapacity || truck?.totalCapacity || 1;
  const capacityPct = Math.min(Math.round((maxLoad / capacity) * 100), 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Active Route"
        subtitle={truck ? `Truck ${truck.licensePlate}` : 'Delivery Corridor'}
        onBack={() => navigation.goBack()}
        rightAction={{
          iconName: 'refresh',
          onPress: onRefresh,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primaryLight}
            colors={[THEME.colors.primaryLight]}
          />
        }
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={THEME.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {trip ? (
          <>
            {/* Route Overview Card */}
            <Card variant="elevated" style={styles.overviewCard}>
              <View style={styles.cardHeader}>
                <Badge
                  label={isMerged ? 'CONSOLIDATED HIGHWAY RUN' : 'DIRECT DISPATCH'}
                  variant={isMerged ? 'warning' : 'primary'}
                />
                <Text style={styles.stopsCountTag}>
                  {trip.stops.length} Stops
                </Text>
              </View>

              <View style={styles.corridorBlock}>
                <View style={styles.corridorEndpoint}>
                  <Text style={styles.corridorLabel}>ORIGIN</Text>
                  <Text style={styles.cityName}>{trip.origin}</Text>
                </View>
                <View style={styles.arrowDivider}>
                  <Ionicons name="arrow-forward" size={18} color={THEME.colors.primaryLight} />
                </View>
                <View style={styles.corridorEndpoint}>
                  <Text style={styles.corridorLabel}>FINAL DESTINATION</Text>
                  <Text style={styles.cityName}>{trip.destination}</Text>
                </View>
              </View>

              {/* Capacity Utilization Progress Bar */}
              <View style={styles.capacitySection}>
                <View style={styles.capacityHeader}>
                  <Text style={styles.capacityLabel}>PEAK CARGO UTILIZATION</Text>
                  <Text style={styles.capacityValue}>
                    {maxLoad.toLocaleString()} / {capacity.toLocaleString()} kg ({capacityPct}%)
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${capacityPct}%` },
                      capacityPct > 85 ? styles.progressHigh : styles.progressNormal,
                    ]}
                  />
                </View>
              </View>
            </Card>

            {/* Live GPS Fleet Tracking Controls & Telemetry */}
            {truck && (
              <TrackingCard
                tripId={trip.id}
                truckId={truck.id}
                truckLicensePlate={truck.licensePlate}
                origin={trip.origin}
                destination={trip.destination}
              />
            )}

            {/* Ordered Stops Section */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="git-commit-outline" size={20} color={THEME.colors.primaryLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Ordered Stops & Operational Milestones</Text>
                  <Text style={styles.sectionSubtitle}>Tap any stop to record arrival, pickup, or delivery</Text>
                </View>
              </View>
              <StopTimeline
                stops={trip.stops}
                richStops={stopsData?.stops}
                currentLoads={trip.currentLoad}
                remainingLoads={trip.remainingLoad}
                nextStopIndex={stopsData?.currentStopIndex !== undefined ? stopsData.currentStopIndex : 1}
                onSelectStop={(idx, name) => navigation.navigate('StopDetails', { stopIndex: idx, stopName: name })}
              />
            </Card>

            {/* Consolidated Shipment Manifest Section */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="file-tray-full-outline" size={20} color={THEME.colors.secondary} />
                <Text style={styles.sectionTitle}>
                  {isMerged ? 'Consolidated Cargo Manifest' : 'Vehicle Manifest'}
                </Text>
              </View>
              <ManifestCard manifest={trip.manifest} />
            </Card>
          </>
        ) : !loading && (
          <EmptyState
            iconName="map"
            title="No Active Delivery Route"
            description="Your assigned truck currently does not have an active schedule."
            actionTitle="Refresh"
            onAction={onRefresh}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: THEME.spacing.md,
    gap: THEME.spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.dangerBg,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    gap: 8,
  },
  errorText: {
    ...THEME.typography.caption,
    color: THEME.colors.danger,
    flex: 1,
  },
  overviewCard: {
    gap: THEME.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopsCountTag: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  corridorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  corridorEndpoint: {
    flex: 1,
    gap: 2,
  },
  arrowDivider: {
    paddingHorizontal: THEME.spacing.sm,
  },
  corridorLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  capacitySection: {
    gap: 6,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
  },
  capacityValue: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressNormal: {
    backgroundColor: THEME.colors.primaryLight,
  },
  progressHigh: {
    backgroundColor: THEME.colors.secondary,
  },
  sectionCard: {
    gap: THEME.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.sm,
  },
  sectionTitle: {
    ...THEME.typography.titleSmall,
    color: THEME.colors.text,
  },
  sectionSubtitle: {
    ...THEME.typography.caption,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
});

