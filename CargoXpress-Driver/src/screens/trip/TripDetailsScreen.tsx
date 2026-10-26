import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { tripApi } from '../../api/tripApi';
import { THEME } from '../../constants/theme';
import { TripDetailsRouteProp, AppNavigationProp } from '../../navigation/types';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { StopTimeline } from '../../components/StopTimeline';
import { ManifestCard } from '../../components/ManifestCard';
import { EmptyState } from '../../components/EmptyState';
import { TripData } from '../../types/trip';

export const TripDetailsScreen: React.FC = () => {
  const route = useRoute<TripDetailsRouteProp>();
  const navigation = useNavigation<AppNavigationProp>();
  const { tripId } = route.params;

  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTripDetails = useCallback(async () => {
    setError(null);
    try {
      const res = await tripApi.getTripDetails(tripId);
      setTrip(res.trip);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trip details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTripDetails();
  }, [fetchTripDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTripDetails();
  };

  const isMerged = trip?.type === 'MergedSchedule';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Trip Specification"
        subtitle={`Ref: ${tripId.slice(-8).toUpperCase()}`}
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
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primaryLight} />
            <Text style={styles.loaderText}>Retrieving trip specification...</Text>
          </View>
        ) : error ? (
          <EmptyState
            iconName="alert-circle-outline"
            title="Trip Access Restricted"
            description={error}
            actionTitle="Go Back"
            onAction={() => navigation.goBack()}
          />
        ) : trip ? (
          <>
            {/* Header Summary */}
            <Card variant="elevated" style={styles.summaryCard}>
              <View style={styles.badgeRow}>
                <Badge
                  label={isMerged ? 'CONSOLIDATED SCHEDULE' : 'STANDARD ROUTE'}
                  variant={isMerged ? 'warning' : 'primary'}
                />
                <Badge
                  label={trip.status ? trip.status.toUpperCase() : 'SCHEDULED'}
                  variant="success"
                  size="small"
                />
              </View>

              <View style={styles.endpointsRow}>
                <View style={styles.endpoint}>
                  <Text style={styles.label}>DISPATCH ORIGIN</Text>
                  <Text style={styles.cityName}>{trip.origin}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={THEME.colors.textMuted} />
                <View style={[styles.endpoint, styles.endpointRight]}>
                  <Text style={styles.label}>FINAL DESTINATION</Text>
                  <Text style={styles.cityName}>{trip.destination}</Text>
                </View>
              </View>

              {trip.totalCapacity && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Total Rated Capacity:</Text>
                  <Text style={styles.metaValue}>{trip.totalCapacity.toLocaleString()} kg</Text>
                </View>
              )}
            </Card>

            {/* Stops Breakdown */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="git-commit-outline" size={20} color={THEME.colors.primaryLight} />
                <Text style={styles.sectionTitle}>
                  Ordered Stops ({trip.stops.length})
                </Text>
              </View>
              <StopTimeline
                stops={trip.stops}
                currentLoads={trip.currentLoad}
                remainingLoads={trip.remainingLoad}
                nextStopIndex={1}
              />
            </Card>

            {/* Manifest */}
            {trip.manifest && trip.manifest.length > 0 && (
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="documents-outline" size={20} color={THEME.colors.secondary} />
                  <Text style={styles.sectionTitle}>Manifest Assignments</Text>
                </View>
                <ManifestCard manifest={trip.manifest} />
              </Card>
            )}
          </>
        ) : null}
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
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: THEME.spacing.md,
  },
  loaderText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  summaryCard: {
    gap: THEME.spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  endpointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  endpoint: {
    flex: 1,
    gap: 2,
  },
  endpointRight: {
    alignItems: 'flex-end',
  },
  label: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  metaValue: {
    ...THEME.typography.caption,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
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
});
