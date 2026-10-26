import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { tripApi } from '../../api/tripApi';
import { mergeApi } from '../../api/mergeApi';
import { THEME } from '../../constants/theme';
import { AppNavigationProp } from '../../navigation/types';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ActiveTripResponse } from '../../types/trip';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { driver, logout } = useAuth();

  const [activeTripData, setActiveTripData] = useState<ActiveTripResponse | null>(null);
  const [pendingMergeOffersCount, setPendingMergeOffersCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setErrorMessage(null);
    try {
      const [tripRes, offersRes] = await Promise.all([
        tripApi.getActiveTrip().catch((err) => {
          console.warn('Active trip fetch error:', err);
          return { trip: null, message: err.message };
        }),
        mergeApi.getMergeOffers().catch((err) => {
          console.warn('Merge offers fetch error:', err);
          return { offers: [] };
        }),
      ]);

      setActiveTripData(tripRes);
      setPendingMergeOffersCount(offersRes.offers ? offersRes.offers.length : 0);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to refresh dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const truck = activeTripData?.truck;
  const trip = activeTripData?.trip;

  // Determine current/next stop
  const stops = trip?.stops || [];
  const nextStop = stops.length > 1 ? stops[1] : stops[0] || 'N/A';
  const totalStops = stops.length;
  const isConsolidated = trip?.type === 'MergedSchedule';

  return (
    <SafeAreaView style={styles.safeArea}>
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
        {/* Top Driver Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greetingText}>DRIVER COCKPIT</Text>
            <Text style={styles.driverName}>{driver?.name || 'Driver'}</Text>
          </View>
          <View style={styles.topRightRow}>
            <Badge
              label={driver?.status ? driver.status.replace('_', ' ') : 'ACTIVE'}
              variant={driver?.status === 'on_duty' ? 'success' : 'primary'}
            />
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileButton}
            >
              <Ionicons name="person-circle-outline" size={28} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color={THEME.colors.warning} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* Assigned Vehicle Card */}
        <Card variant="elevated" style={styles.vehicleCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="car-sport" size={22} color={THEME.colors.primaryLight} />
              <Text style={styles.cardTitle}>Assigned Truck</Text>
            </View>
            {truck && <Badge label="ACTIVE DUTY" variant="success" size="small" />}
          </View>

          {truck ? (
            <View style={styles.vehicleDetails}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>LICENSE PLATE</Text>
                <Text style={styles.plateText}>{truck.licensePlate}</Text>
              </View>
              <View style={styles.detailColRight}>
                <Text style={styles.detailLabel}>RATED CAPACITY</Text>
                <Text style={styles.capacityText}>
                  {truck.totalCapacity?.toLocaleString() || 'N/A'} kg
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.unassignedBox}>
              <Ionicons name="alert-circle-outline" size={20} color={THEME.colors.textMuted} />
              <Text style={styles.unassignedText}>
                No truck is currently assigned to your shift. Contact your fleet dispatcher.
              </Text>
            </View>
          )}
        </Card>

        {/* Pending Merge Offers Notification Card */}
        {pendingMergeOffersCount > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MergeOffers')}
          >
            <Card variant="accent" style={styles.mergeAlertCard}>
              <View style={styles.mergeAlertRow}>
                <View style={styles.mergeIconCircle}>
                  <Ionicons name="git-merge" size={20} color={THEME.colors.secondary} />
                </View>
                <View style={styles.mergeTextCol}>
                  <Text style={styles.mergeAlertTitle}>
                    {pendingMergeOffersCount} Pending Merge {pendingMergeOffersCount === 1 ? 'Offer' : 'Offers'}
                  </Text>
                  <Text style={styles.mergeAlertSubtitle}>
                    A compatible truck corridor has been detected for your route.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={THEME.colors.secondary} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Active Trip Section */}
        {trip ? (
          <Card variant="elevated" style={styles.tripCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons
                  name={isConsolidated ? 'cube' : 'navigate'}
                  size={20}
                  color={isConsolidated ? THEME.colors.secondary : THEME.colors.primaryLight}
                />
                <Text style={styles.cardTitle}>
                  {isConsolidated ? 'Consolidated Delivery' : 'Direct Route'}
                </Text>
              </View>
              <Badge
                label={isConsolidated ? 'MERGED' : 'STANDARD'}
                variant={isConsolidated ? 'warning' : 'primary'}
                size="small"
              />
            </View>

            {/* Origin to Destination */}
            <View style={styles.corridorContainer}>
              <View style={styles.stopPoint}>
                <Ionicons name="radio-button-on" size={16} color={THEME.colors.primaryLight} />
                <Text style={styles.corridorText}>{trip.origin}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={THEME.colors.textMuted} />
              <View style={styles.stopPoint}>
                <Ionicons name="location" size={16} color={THEME.colors.secondary} />
                <Text style={styles.corridorText}>{trip.destination}</Text>
              </View>
            </View>

            {/* Next Stop Highlight */}
            <View style={styles.nextStopBox}>
              <View style={styles.nextStopRow}>
                <View>
                  <Text style={styles.nextStopLabel}>NEXT SCHEDULED STOP</Text>
                  <Text style={styles.nextStopName}>{nextStop}</Text>
                </View>
                <View style={styles.stopsCountBadge}>
                  <Text style={styles.stopsCountText}>{totalStops} Total Stops</Text>
                </View>
              </View>
            </View>

            {/* Action shortcut to full route */}
            <Button
              title="View Complete Route & Stops"
              onPress={() => navigation.navigate('ActiveTrip')}
              variant="primary"
              size="medium"
              icon={<Ionicons name="map-outline" size={18} color={THEME.colors.white} />}
              style={styles.viewRouteButton}
            />
          </Card>
        ) : !loading && (
          <Card style={styles.noTripCard}>
            <EmptyState
              iconName="map-outline"
              title="No Active Delivery Assigned"
              description="Your assigned truck does not currently have a scheduled delivery route."
              actionTitle="Refresh Schedule"
              onAction={onRefresh}
            />
          </Card>
        )}

        {/* Quick Access Shortcuts */}
        <View style={styles.shortcutsGrid}>
          <TouchableOpacity
            style={styles.shortcutTile}
            onPress={() => navigation.navigate('ActiveTrip')}
          >
            <View style={[styles.shortcutIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
              <Ionicons name="list" size={24} color={THEME.colors.primaryLight} />
            </View>
            <Text style={styles.shortcutTitle}>Route Stops</Text>
            <Text style={styles.shortcutDesc}>Order & Loads</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutTile}
            onPress={() => navigation.navigate('MergeOffers')}
          >
            <View style={[styles.shortcutIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="git-merge-outline" size={24} color={THEME.colors.secondary} />
            </View>
            <Text style={styles.shortcutTitle}>Merge Offers</Text>
            <Text style={styles.shortcutDesc}>{pendingMergeOffersCount} Available</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutTile}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.shortcutIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="person-outline" size={24} color={THEME.colors.success} />
            </View>
            <Text style={styles.shortcutTitle}>Driver Profile</Text>
            <Text style={styles.shortcutDesc}>Shift & License</Text>
          </TouchableOpacity>
        </View>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  greetingText: {
    ...THEME.typography.badge,
    color: THEME.colors.primaryLight,
  },
  driverName: {
    ...THEME.typography.titleMedium,
    color: THEME.colors.text,
    marginTop: 2,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  profileButton: {
    padding: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.warningBg,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  errorBannerText: {
    ...THEME.typography.caption,
    color: THEME.colors.warning,
    flex: 1,
  },
  vehicleCard: {
    gap: THEME.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...THEME.typography.titleSmall,
    color: THEME.colors.text,
  },
  vehicleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  detailCol: {
    gap: 4,
  },
  detailColRight: {
    gap: 4,
    alignItems: 'flex-end',
  },
  detailLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
  },
  plateText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  capacityText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.primaryLight,
  },
  unassignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: THEME.spacing.sm,
  },
  unassignedText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    flex: 1,
  },
  mergeAlertCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  mergeAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  mergeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mergeTextCol: {
    flex: 1,
    gap: 2,
  },
  mergeAlertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.secondary,
  },
  mergeAlertSubtitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
  },
  tripCard: {
    gap: THEME.spacing.md,
  },
  corridorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  stopPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  corridorText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  nextStopBox: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
  },
  nextStopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextStopLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.primaryLight,
  },
  nextStopName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 2,
  },
  stopsCountBadge: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  stopsCountText: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  viewRouteButton: {
    marginTop: 4,
  },
  noTripCard: {
    padding: 0,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  shortcutTile: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 4,
  },
  shortcutIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  shortcutDesc: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
