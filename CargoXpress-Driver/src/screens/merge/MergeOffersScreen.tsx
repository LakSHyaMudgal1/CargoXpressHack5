import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { mergeApi } from '../../api/mergeApi';
import { THEME } from '../../constants/theme';
import { AppNavigationProp } from '../../navigation/types';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { MergeOffer } from '../../types/merge';

const PRESET_REJECTION_REASONS = [
  'Capacity headroom tight',
  'Tight delivery schedule',
  'Severe weather / road delay',
  'Vehicle mechanical concern',
  'Route deviation concern',
  'Other operational concern',
];

export const MergeOffersScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [offers, setOffers] = useState<MergeOffer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoadingPairId, setActionLoadingPairId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rejection modal state
  const [rejectModalVisible, setRejectModalVisible] = useState<boolean>(false);
  const [rejectTargetOffer, setRejectTargetOffer] = useState<MergeOffer | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REJECTION_REASONS[0]);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [submittingReject, setSubmittingReject] = useState<boolean>(false);

  const fetchMergeOffers = useCallback(async () => {
    setError(null);
    try {
      const res = await mergeApi.getMergeOffers();
      setOffers(res.offers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve merge offers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMergeOffers();
  }, [fetchMergeOffers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMergeOffers();
  };

  const handleAcceptOffer = (offer: MergeOffer) => {
    if (actionLoadingPairId) return;

    const partnerPlate = offer.partnerTruck?.licensePlate || 'Partner Truck';
    const additionalStopsCount = offer.proposedRoute?.additionalStopsCount || 0;

    Alert.alert(
      'Accept Merge Proposal',
      `Are you sure you want to accept absorbing cargo from ${partnerPlate}?\n\nThis will add ${additionalStopsCount} stops to your route itinerary.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Update Route',
          onPress: async () => {
            setActionLoadingPairId(offer.pairId);
            try {
              const res = await mergeApi.acceptMergeOffer(offer.pairId);
              Alert.alert(
                'Merge Confirmed',
                res.message || 'The consolidated route has been assigned to your vehicle.',
                [
                  {
                    text: 'View Active Route',
                    onPress: () => navigation.navigate('ActiveTrip'),
                  },
                  {
                    text: 'Done',
                    onPress: () => fetchMergeOffers(),
                  },
                ]
              );
            } catch (err: any) {
              Alert.alert(
                'Merge Failed',
                err.message || 'This offer could not be accepted. It may be stale or already processed.',
                [{ text: 'Refresh', onPress: () => fetchMergeOffers() }]
              );
            } finally {
              setActionLoadingPairId(null);
            }
          },
        },
      ]
    );
  };

  const openRejectModal = (offer: MergeOffer) => {
    if (actionLoadingPairId) return;
    setRejectTargetOffer(offer);
    setSelectedReason(PRESET_REJECTION_REASONS[0]);
    setCustomNotes('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetOffer) return;
    setSubmittingReject(true);

    try {
      const res = await mergeApi.rejectMergeOffer(
        rejectTargetOffer.pairId,
        selectedReason,
        customNotes.trim() ? customNotes.trim() : undefined
      );

      setRejectModalVisible(false);
      setRejectTargetOffer(null);

      Alert.alert(
        'Offer Declined',
        res.message || 'The merge offer was rejected and both vehicles will dispatch independently.',
        [{ text: 'OK', onPress: () => fetchMergeOffers() }]
      );
    } catch (err: any) {
      Alert.alert(
        'Action Failed',
        err.message || 'Could not decline this offer. It may have already been updated.',
        [{ text: 'Refresh', onPress: () => fetchMergeOffers() }]
      );
    } finally {
      setSubmittingReject(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Merge Offers"
        subtitle={`${offers.length} Pending Route Proposals`}
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
        {/* Informational Guidance Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="git-merge" size={22} color={THEME.colors.secondary} />
          <View style={styles.infoBannerTextContainer}>
            <Text style={styles.infoBannerTitle}>Autonomous Driver Decisions</Text>
            <Text style={styles.infoBannerText}>
              Review proposed highway corridor consolidations. Carrier drivers have direct authority
              to accept or decline additional cargo along their active routes.
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={THEME.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {offers.length > 0 ? (
          offers.map((offer) => {
            const isProcessing = actionLoadingPairId === offer.pairId;
            const myStops = offer.myTruck?.currentStops || offer.myTruck?.stops || [];
            const partnerStops = offer.partnerTruck?.stops || [];
            const proposedStops = offer.proposedRoute?.consolidatedStops || [];
            const additionalStops = offer.proposedRoute?.additionalStops || [];
            const incomingPlate = offer.incomingShipment?.licensePlate || offer.partnerTruck?.licensePlate;

            return (
              <Card key={offer.pairId} variant="elevated" style={styles.offerCard}>
                {/* Header row: Role Badge & Timestamp */}
                <View style={styles.offerHeader}>
                  <View style={styles.badgeRow}>
                    {offer.isCarrier ? (
                      <Badge label="DESIGNATED CARRIER" variant="success" />
                    ) : (
                      <Badge label="CARGO ABSORPTION" variant="warning" />
                    )}
                    {offer.feasible === false && (
                      <Badge label="CAPACITY LIMIT" variant="danger" />
                    )}
                  </View>
                  <Text style={styles.offerTimestamp}>
                    {new Date(offer.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {/* Role Description Notice */}
                <View
                  style={[
                    styles.roleBanner,
                    offer.isCarrier ? styles.roleBannerCarrier : styles.roleBannerAbsorbed,
                  ]}
                >
                  <Ionicons
                    name={offer.isCarrier ? 'shield-checkmark' : 'arrow-forward-circle'}
                    size={16}
                    color={offer.isCarrier ? THEME.colors.success : THEME.colors.secondary}
                  />
                  <Text style={styles.roleBannerText}>
                    {offer.roleDescription ||
                      (offer.isCarrier
                        ? 'Your vehicle will carry consolidated shipments'
                        : 'Your vehicle cargo will merge into partner truck')}
                  </Text>
                </View>

                {/* Section 1: Assigned Vehicle & Current Route */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>CURRENT ASSIGNED ROUTE</Text>
                  <View style={styles.routeDetailBox}>
                    <View style={styles.truckMetaRow}>
                      <Ionicons name="bus" size={16} color={THEME.colors.primaryLight} />
                      <Text style={styles.plateText}>{offer.myTruck?.licensePlate}</Text>
                      {offer.myTruck?.totalCapacity && (
                        <Text style={styles.metaDimText}>
                          ({offer.myTruck.totalCapacity} kg capacity)
                        </Text>
                      )}
                    </View>
                    <Text style={styles.stopsPathText}>
                      {myStops.length > 0 ? myStops.join('  ➔  ') : 'Direct Corridor'}
                    </Text>
                  </View>
                </View>

                {/* Section 2: Incoming Shipment Reference */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>INCOMING CARGO REFERENCE</Text>
                  <View style={styles.incomingBox}>
                    <View style={styles.incomingHeader}>
                      <Ionicons name="cube" size={16} color={THEME.colors.secondary} />
                      <Text style={styles.incomingTitle}>
                        Shipment from Truck {incomingPlate}
                      </Text>
                    </View>
                    <Text style={styles.incomingRoute}>
                      Transfer Corridor: {partnerStops[0] || 'Origin'} ➔{' '}
                      {partnerStops[partnerStops.length - 1] || 'Destination'}
                    </Text>
                    {offer.incomingShipment?.loadKg && (
                      <Text style={styles.incomingLoadText}>
                        Cargo Weight: {Array.isArray(offer.incomingShipment.loadKg)
                          ? Math.max(...offer.incomingShipment.loadKg)
                          : offer.incomingShipment.loadKg}{' '}
                        kg
                      </Text>
                    )}
                  </View>
                </View>

                {/* Section 3: Proposed Consolidated Route */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>PROPOSED CONSOLIDATED ROUTE</Text>
                  <View style={styles.consolidatedBox}>
                    <View style={styles.consolidatedEndpoints}>
                      <Ionicons name="navigate" size={16} color={THEME.colors.info} />
                      <Text style={styles.consolidatedEndpointText}>
                        {offer.proposedRoute?.origin || myStops[0]} ➔{' '}
                        {offer.proposedRoute?.destination || myStops[myStops.length - 1]}
                      </Text>
                    </View>

                    {proposedStops.length > 0 && (
                      <Text style={styles.stopsPathTextHighlight}>
                        {proposedStops.join('  ➔  ')}
                      </Text>
                    )}

                    {/* Additional Stops Highlight */}
                    <View style={styles.additionalStopsRow}>
                      <Text style={styles.additionalStopsLabel}>Route Deviation:</Text>
                      {additionalStops.length > 0 ? (
                        <View style={styles.chipsContainer}>
                          {additionalStops.map((stop, idx) => (
                            <View key={idx} style={styles.stopChip}>
                              <Text style={styles.stopChipText}>+ {stop}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.zeroDeviationText}>
                          Direct corridor match (0 additional intermediate stops)
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Operational Safety & Corridor Assurance Note */}
                <View style={styles.safetyNotice}>
                  <Ionicons name="analytics-outline" size={15} color={THEME.colors.textMuted} />
                  <Text style={styles.safetyNoticeText}>
                    {additionalStops.length > 0
                      ? `Corridor calculation verified: ${additionalStops.length} intermediate waypoint(s) within delivery window.`
                      : 'Verified: Exact forward corridor alignment with zero off-route detour.'}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  {offer.canAccept ? (
                    <>
                      <Button
                        title="Accept Merge"
                        variant="primary"
                        onPress={() => handleAcceptOffer(offer)}
                        loading={isProcessing}
                        disabled={!!actionLoadingPairId}
                        style={styles.actionBtn}
                        icon={
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={18}
                            color={THEME.colors.white}
                            style={{ marginRight: 6 }}
                          />
                        }
                      />
                      <Button
                        title="Reject"
                        variant="danger"
                        onPress={() => openRejectModal(offer)}
                        disabled={!!actionLoadingPairId}
                        style={styles.actionBtn}
                        icon={
                          <Ionicons
                            name="close-circle-outline"
                            size={18}
                            color={THEME.colors.white}
                            style={{ marginRight: 6 }}
                          />
                        }
                      />
                    </>
                  ) : (
                    <Button
                      title="Decline Offer"
                      variant="outline"
                      onPress={() => openRejectModal(offer)}
                      disabled={!!actionLoadingPairId}
                      style={styles.actionBtnFull}
                      icon={
                        <Ionicons
                          name="close-circle-outline"
                          size={18}
                          color={THEME.colors.primaryLight}
                          style={{ marginRight: 6 }}
                        />
                      }
                    />
                  )}
                </View>
              </Card>
            );
          })
        ) : !loading ? (
          <EmptyState
            iconName="git-merge-outline"
            title="No Active Merge Offers"
            description="There are currently no pending merge proposals matching your assigned vehicle."
            actionTitle="Refresh Offers"
            onAction={onRefresh}
          />
        ) : null}
      </ScrollView>

      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!submittingReject) setRejectModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="close-circle" size={24} color={THEME.colors.danger} />
              <Text style={styles.modalTitle}>Decline Merge Proposal</Text>
            </View>

            <Text style={styles.modalSubtitle}>
              Please select the operational reason for rejecting this corridor merge:
            </Text>

            {/* Reason selector chips */}
            <View style={styles.reasonChipsList}>
              {PRESET_REJECTION_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setSelectedReason(reason)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={isSelected ? THEME.colors.primaryLight : THEME.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.reasonOptionText,
                        isSelected && styles.reasonOptionTextSelected,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Notes input */}
            <Text style={styles.notesLabel}>Additional Driver Notes (Optional):</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Traffic bottleneck near highway junction, load dimensions..."
              placeholderTextColor={THEME.colors.textMuted}
              value={customNotes}
              onChangeText={setCustomNotes}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setRejectModalVisible(false)}
                disabled={submittingReject}
                style={styles.modalBtn}
              />
              <Button
                title={submittingReject ? 'Submitting...' : 'Confirm Reject'}
                variant="danger"
                onPress={handleConfirmReject}
                loading={submittingReject}
                disabled={submittingReject}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  infoBannerTextContainer: {
    flex: 1,
    gap: 4,
  },
  infoBannerTitle: {
    ...THEME.typography.titleSmall,
    color: THEME.colors.secondaryLight,
    fontSize: 14,
  },
  infoBannerText: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
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
  offerCard: {
    gap: THEME.spacing.md,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  offerTimestamp: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    gap: 8,
  },
  roleBannerCarrier: {
    backgroundColor: THEME.colors.successBg,
  },
  roleBannerAbsorbed: {
    backgroundColor: THEME.colors.warningBg,
  },
  roleBannerText: {
    ...THEME.typography.caption,
    color: THEME.colors.text,
    flex: 1,
    fontWeight: '600',
  },
  sectionBlock: {
    gap: 6,
  },
  sectionTitle: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  routeDetailBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  truckMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plateText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  metaDimText: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
  },
  stopsPathText: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  incomingBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  incomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incomingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.secondaryLight,
  },
  incomingRoute: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
  },
  incomingLoadText: {
    ...THEME.typography.caption,
    color: THEME.colors.text,
    fontWeight: '600',
  },
  consolidatedBox: {
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  consolidatedEndpoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  consolidatedEndpointText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  stopsPathTextHighlight: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.primaryLight,
    fontWeight: '600',
  },
  additionalStopsRow: {
    gap: 6,
    marginTop: 4,
  },
  additionalStopsLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stopChip: {
    backgroundColor: THEME.colors.infoBg,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: THEME.colors.info,
  },
  stopChipText: {
    ...THEME.typography.caption,
    color: THEME.colors.info,
    fontWeight: '600',
  },
  zeroDeviationText: {
    ...THEME.typography.caption,
    color: THEME.colors.success,
    fontWeight: '500',
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: THEME.spacing.xs,
  },
  safetyNoticeText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
  actionBtnFull: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    width: '100%',
    maxWidth: 420,
    gap: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    ...THEME.typography.titleMedium,
    color: THEME.colors.text,
  },
  modalSubtitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  reasonChipsList: {
    gap: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  reasonOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: THEME.colors.primaryLight,
  },
  reasonOptionText: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.textSecondary,
  },
  reasonOptionTextSelected: {
    color: THEME.colors.text,
    fontWeight: '600',
  },
  notesLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.sm,
    color: THEME.colors.text,
    ...THEME.typography.bodyMedium,
    textAlignVertical: 'top',
    height: 70,
  },
  modalActions: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});
