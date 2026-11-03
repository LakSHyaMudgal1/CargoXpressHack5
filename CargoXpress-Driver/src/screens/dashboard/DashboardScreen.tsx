import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { tripApi } from '../../api/tripApi';
import { mergeApi } from '../../api/mergeApi';
import { locationService } from '../../services/locationService';
import { THEME } from '../../constants/theme';
import { AppNavigationProp } from '../../navigation/types';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { DriverBottomNav } from '../../components/DriverBottomNav';
import { ActiveTripResponse } from '../../types/trip';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { driver } = useAuth();

  const [activeTripData, setActiveTripData] = useState<ActiveTripResponse | null>(null);
  const [pendingMergeOffersCount, setPendingMergeOffersCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(locationService.isTracking());

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
      setIsGpsActive(locationService.isTracking());
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to refresh dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Check GPS state periodically
    const gpsInterval = setInterval(() => {
      setIsGpsActive(locationService.isTracking());
    }, 4000);

    return () => clearInterval(gpsInterval);
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const truck = activeTripData?.truck;
  const trip = activeTripData?.trip;

  // Stops calculation
  const stops = trip?.stops || [];
  const totalStops = stops.length;
  const nextStop = totalStops > 1 ? stops[1] : stops[0] || 'N/A';
  const remainingStopsCount = Math.max(totalStops - 1, 0);
  const isConsolidated = trip?.type === 'MergedSchedule';

  // Capacity calculation
  const totalCap = trip?.totalCapacity || truck?.totalCapacity || 10000;
  const currentLoads = trip?.currentLoad || [];
  const peakLoad = currentLoads.length > 0 ? Math.max(...currentLoads) : 0;
  const headroomKg = Math.max(totalCap - peakLoad, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
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
          {/* 1. Driver Cockpit Header */}
          <View style={styles.headerBar}>
            <View>
              <View style={styles.eyebrowRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.eyebrowText}>DRIVER FLEET COCKPIT</Text>
              </View>
              <Text style={styles.driverName}>{driver?.name || 'Driver'}</Text>
              <Text style={styles.companySubtext}>
                {driver?.licenseNumber ? `Lic: ${driver.licenseNumber}` : 'Active Shift'}
              </Text>
            </View>

            <View style={styles.headerRight}>
              {/* GPS status pill */}
              <TouchableOpacity
                style={[
                  styles.gpsPill,
                  isGpsActive ? styles.gpsActivePill : styles.gpsStandbyPill,
                ]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ActiveTrip')}
              >
                <View
                  style={[
                    styles.gpsDot,
                    { backgroundColor: isGpsActive ? THEME.colors.success : THEME.colors.warning },
                  ]}
                />
                <Text
                  style={[
                    styles.gpsText,
                    { color: isGpsActive ? THEME.colors.success : THEME.colors.textMuted },
                  ]}
                >
                  {isGpsActive ? 'GPS LIVE' : 'GPS STANDBY'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                style={styles.profileAvatarButton}
                activeOpacity={0.7}
              >
                <Ionicons name="person" size={18} color={THEME.colors.primaryLight} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Network or Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={THEME.colors.warning} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* 2. Pending Merge Offers Banner */}
          {pendingMergeOffersCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.navigate('MergeOffers')}
            >
              <View style={styles.mergeBanner}>
                <View style={styles.mergeIconBox}>
                  <Ionicons name="git-merge" size={22} color="#000" />
                </View>
                <View style={styles.mergeContent}>
                  <View style={styles.mergeTitleRow}>
                    <Text style={styles.mergeTitle}>
                      {pendingMergeOffersCount} Authorized Merge {pendingMergeOffersCount === 1 ? 'Offer' : 'Offers'}
                    </Text>
                    <Badge label="DECISION REQUIRED" variant="warning" size="small" />
                  </View>
                  <Text style={styles.mergeSubtitle}>
                    A compatible corridor consolidation has been assigned for your review.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={THEME.colors.secondary} />
              </View>
            </TouchableOpacity>
          )}

          {/* 3. Hero Active Mission Deck */}
          {trip ? (
            <View style={styles.missionDeck}>
              {/* Truck Plate & Trip Type */}
              <View style={styles.missionTopRow}>
                <View style={styles.truckBadge}>
                  <Ionicons name="bus" size={16} color={THEME.colors.primaryLight} />
                  <Text style={styles.truckPlateText}>
                    {truck?.licensePlate || 'ASSIGNED VEHICLE'}
                  </Text>
                </View>

                <Badge
                  label={isConsolidated ? 'CONSOLIDATED RUN' : 'DIRECT DISPATCH'}
                  variant={isConsolidated ? 'warning' : 'primary'}
                />
              </View>

              {/* Corridor Route Visualizer */}
              <View style={styles.corridorTrack}>
                <View style={styles.corridorStop}>
                  <Text style={styles.corridorLabel}>ORIGIN</Text>
                  <Text style={styles.corridorCity}>{trip.origin}</Text>
                </View>

                <View style={styles.corridorMidLine}>
                  <View style={styles.lineBar} />
                  <Ionicons name="arrow-forward-circle" size={20} color={THEME.colors.primaryLight} />
                  <View style={styles.lineBar} />
                </View>

                <View style={styles.corridorStopRight}>
                  <Text style={styles.corridorLabel}>DESTINATION</Text>
                  <Text style={styles.corridorCity}>{trip.destination}</Text>
                </View>
              </View>

              {/* Next Stop Spotlight Box */}
              <View style={styles.nextStopHeroBox}>
                <View style={styles.nextStopTagRow}>
                  <View style={styles.nextStopPill}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.nextStopPillText}>NEXT SCHEDULED STOP</Text>
                  </View>
                  <Text style={styles.remainingStopsTag}>
                    {remainingStopsCount} {remainingStopsCount === 1 ? 'Stop' : 'Stops'} Remaining
                  </Text>
                </View>

                <Text style={styles.nextStopCityName}>{nextStop}</Text>
                <Text style={styles.nextStopSubtext}>
                  Total Route: {totalStops} Stops across highway corridor
                </Text>
              </View>

              {/* Payload & Headroom Bar */}
              <View style={styles.payloadSummaryRow}>
                <View style={styles.payloadStat}>
                  <Text style={styles.payloadLabel}>PEAK PAYLOAD</Text>
                  <Text style={styles.payloadValue}>{peakLoad.toLocaleString()} kg</Text>
                </View>
                <View style={styles.payloadDivider} />
                <View style={styles.payloadStat}>
                  <Text style={styles.payloadLabel}>RATED CAPACITY</Text>
                  <Text style={styles.payloadValue}>{totalCap.toLocaleString()} kg</Text>
                </View>
                <View style={styles.payloadDivider} />
                <View style={styles.payloadStat}>
                  <Text style={styles.payloadLabel}>HEADROOM</Text>
                  <Text style={[styles.payloadValue, { color: THEME.colors.success }]}>
                    {headroomKg.toLocaleString()} kg
                  </Text>
                </View>
              </View>

              {/* PROMINENT ACTION: Open Active Route */}
              <TouchableOpacity
                style={styles.openRouteButton}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ActiveTrip')}
              >
                <Ionicons name="map" size={20} color="#FFFFFF" />
                <Text style={styles.openRouteButtonText}>Open Route & Stop Manifest</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : !loading ? (
            <Card style={styles.noTripCard}>
              <EmptyState
                iconName="navigate-outline"
                title="No Active Delivery Assigned"
                description="Your assigned truck does not currently have a scheduled delivery route in the dispatch queue."
                actionTitle="Refresh Schedule"
                onAction={onRefresh}
              />
            </Card>
          ) : null}

          {/* 4. Quick Action Station */}
          <View style={styles.quickStation}>
            <Text style={styles.sectionHeaderTitle}>QUICK ACTIONS</Text>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionTile}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ActiveTrip')}
              >
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                  <Ionicons name="list" size={22} color={THEME.colors.primaryLight} />
                </View>
                <Text style={styles.actionTitle}>Stop Sequence</Text>
                <Text style={styles.actionDesc}>{totalStops} Stops</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionTile}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('MergeOffers')}
              >
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="git-merge" size={22} color={THEME.colors.secondary} />
                </View>
                <Text style={styles.actionTitle}>Merge Offers</Text>
                <Text style={styles.actionDesc}>
                  {pendingMergeOffersCount > 0 ? `${pendingMergeOffersCount} Pending` : 'Up to date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionTile}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Profile')}
              >
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="shield-checkmark" size={22} color={THEME.colors.success} />
                </View>
                <Text style={styles.actionTitle}>Driver Duty</Text>
                <Text style={styles.actionDesc}>Shift & Security</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Persistent Bottom Navigation Dock */}
        <DriverBottomNav
          currentScreen="Dashboard"
          pendingOffersCount={pendingMergeOffersCount}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  scrollContent: {
    padding: THEME.spacing.md,
    gap: THEME.spacing.md,
    paddingBottom: THEME.spacing.xl,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: THEME.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  driverName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  companySubtext: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  gpsActivePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  gpsStandbyPill: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gpsText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  profileAvatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
  },
  errorBannerText: {
    fontSize: 12,
    color: THEME.colors.warning,
    flex: 1,
  },
  mergeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1.5,
    borderColor: THEME.colors.secondary,
    borderRadius: THEME.borderRadius.lg,
    padding: 14,
    gap: 12,
  },
  mergeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mergeContent: {
    flex: 1,
    gap: 2,
  },
  mergeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mergeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mergeSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  missionDeck: {
    backgroundColor: '#161F30',
    borderRadius: THEME.borderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  missionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  truckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  truckPlateText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  corridorTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  corridorStop: {
    flex: 1,
  },
  corridorStopRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  corridorLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  corridorCity: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  corridorMidLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 4,
  },
  lineBar: {
    width: 24,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  nextStopHeroBox: {
    backgroundColor: '#0B1120',
    borderRadius: THEME.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    gap: 4,
  },
  nextStopTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextStopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primaryLight,
  },
  nextStopPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primaryLight,
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  remainingStopsTag: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
  },
  nextStopCityName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  nextStopSubtext: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  payloadSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  payloadStat: {
    flex: 1,
    alignItems: 'center',
  },
  payloadDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  payloadLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  payloadValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  openRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    height: 52,
    borderRadius: THEME.borderRadius.md,
    gap: 10,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  openRouteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noTripCard: {
    padding: THEME.spacing.lg,
  },
  quickStation: {
    gap: 10,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginLeft: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionTile: {
    flex: 1,
    backgroundColor: '#161F30',
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    gap: 6,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default DashboardScreen;
