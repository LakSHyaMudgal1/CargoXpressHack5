import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { stopApi } from '../../api/stopApi';
import { THEME } from '../../constants/theme';
import { StopDetailsRouteProp, AppNavigationProp } from '../../navigation/types';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import {
  StopDetailsResponse,
  StopStatus,
  StopType,
  UpdateStopStatusPayload,
} from '../../types/stop';

export const StopDetailsScreen: React.FC = () => {
  const route = useRoute<StopDetailsRouteProp>();
  const navigation = useNavigation<AppNavigationProp>();
  const { stopIndex, stopName } = route.params;

  const [details, setDetails] = useState<StopDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Failure modal state
  const [failureModalVisible, setFailureModalVisible] = useState<boolean>(false);
  const [failureReasonInput, setFailureReasonInput] = useState<string>('');

  // Delivery confirmation / POD modal state
  const [deliveryModalVisible, setDeliveryModalVisible] = useState<boolean>(false);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [podType, setPodType] = useState<'otp' | 'signature' | 'photo' | 'acknowledgement'>('acknowledgement');
  const [podCode, setPodCode] = useState<string>('');
  const [isPartialDelivery, setIsPartialDelivery] = useState<boolean>(false);
  const [partialWeightInput, setPartialWeightInput] = useState<string>('');
  const [partialReasonInput, setPartialReasonInput] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  const fetchStopDetails = useCallback(async () => {
    setError(null);
    try {
      const data = await stopApi.getStopDetails(stopIndex);
      setDetails(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load stop details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stopIndex]);

  useEffect(() => {
    fetchStopDetails();
  }, [fetchStopDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStopDetails();
  };

  const handleStatusTransition = async (targetStatus: StopStatus, customPayload?: Partial<UpdateStopStatusPayload>) => {
    setUpdating(true);
    setError(null);
    try {
      const payload: UpdateStopStatusPayload = {
        status: targetStatus,
        ...customPayload,
      };

      const res = await stopApi.updateStopStatus(stopIndex, payload);
      Alert.alert('Status Updated', res.message);
      await fetchStopDetails();
    } catch (err: any) {
      setError(err.message || 'Status transition failed.');
      Alert.alert('Transition Error', err.message || 'Could not update stop status.');
    } finally {
      setUpdating(false);
    }
  };

  const submitFailure = async () => {
    if (!failureReasonInput.trim()) {
      Alert.alert('Reason Required', 'Please provide a clear operational reason for failure.');
      return;
    }
    setFailureModalVisible(false);
    await handleStatusTransition('failed', {
      failureReason: failureReasonInput.trim(),
    });
    setFailureReasonInput('');
  };

  const submitDeliveryCompletion = async () => {
    if (!recipientName.trim() && details?.stopType === 'delivery') {
      Alert.alert('Recipient Name Required', 'Please enter the name of the person receiving the cargo.');
      return;
    }

    const payload: Partial<UpdateStopStatusPayload> = {
      recipient: {
        name: recipientName.trim() || 'Consignee Staff',
        phone: recipientPhone.trim() || undefined,
        notes: deliveryNotes.trim() || undefined,
      },
      proofOfDelivery: {
        type: podType,
        otpCode: podType === 'otp' ? podCode.trim() : undefined,
        signatureData: podType === 'signature' ? 'SIGNATURE_CAPTURED' : undefined,
        photoReference: podType === 'photo' ? 'PHOTO_POD_CAPTURED' : undefined,
      },
      notes: deliveryNotes.trim() || undefined,
    };

    if (isPartialDelivery && details?.shipments && details.shipments.length > 0) {
      const parsedWeight = parseFloat(partialWeightInput);
      if (isNaN(parsedWeight) || parsedWeight < 0) {
        Alert.alert('Invalid Weight', 'Please provide a valid partial delivered weight.');
        return;
      }
      payload.shipmentUpdates = details.shipments.map(s => ({
        shipmentId: s.shipmentId,
        status: 'partial',
        deliveredWeightKg: parsedWeight,
        failureReason: partialReasonInput.trim() || 'Partial quantity accepted by consignee',
      }));
    }

    setDeliveryModalVisible(false);
    await handleStatusTransition('completed', payload);
  };

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

  const getStopTypeLabel = (type: StopType) => {
    switch (type) {
      case 'pickup': return 'CARGO PICKUP';
      case 'delivery': return 'CARGO DELIVERY';
      case 'pickup_delivery': return 'PICKUP & DELIVERY';
      case 'waypoint': return 'TRANSIT WAYPOINT';
    }
  };

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return null;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={`Stop #${stopIndex + 1}: ${stopName}`}
        subtitle={details ? getStopTypeLabel(details.stopType) : 'Operational Stop'}
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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primaryLight} />
            <Text style={styles.loadingText}>Loading stop execution data...</Text>
          </View>
        ) : details ? (
          <>
            {/* Status & Timing Overview Card */}
            <Card variant="elevated" style={styles.statusCard}>
              <View style={styles.statusHeaderRow}>
                <View>
                  <Text style={styles.sectionLabel}>CURRENT OPERATIONAL STATE</Text>
                  <Text style={styles.stopTitle}>{details.stopName}</Text>
                </View>
                <Badge
                  label={details.status.toUpperCase().replace('_', ' ')}
                  variant={getStatusBadgeVariant(details.status)}
                />
              </View>

              {details.failureReason && (
                <View style={styles.failureBox}>
                  <Ionicons name="warning" size={18} color={THEME.colors.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.failureTitle}>Reported Failure Reason:</Text>
                    <Text style={styles.failureText}>{details.failureReason}</Text>
                  </View>
                </View>
              )}

              <View style={styles.timestampsGrid}>
                {details.arrivedAt && (
                  <View style={styles.timestampItem}>
                    <Ionicons name="location-outline" size={14} color={THEME.colors.info} />
                    <Text style={styles.timestampLabel}>Arrived: </Text>
                    <Text style={styles.timestampValue}>{formatTimestamp(details.arrivedAt)}</Text>
                  </View>
                )}
                {details.completedAt && (
                  <View style={styles.timestampItem}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={THEME.colors.success} />
                    <Text style={styles.timestampLabel}>Completed: </Text>
                    <Text style={styles.timestampValue}>{formatTimestamp(details.completedAt)}</Text>
                  </View>
                )}
                {details.failedAt && (
                  <View style={styles.timestampItem}>
                    <Ionicons name="close-circle-outline" size={14} color={THEME.colors.danger} />
                    <Text style={styles.timestampLabel}>Failed: </Text>
                    <Text style={styles.timestampValue}>{formatTimestamp(details.failedAt)}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons for driver */}
              <View style={styles.actionControls}>
                <Text style={styles.actionControlsLabel}>AVAILABLE DISPATCH ACTIONS</Text>

                {details.status === 'completed' && (
                  <View style={styles.completedNotice}>
                    <Ionicons name="checkmark-done" size={20} color={THEME.colors.success} />
                    <Text style={styles.completedNoticeText}>This stop has been finalized and completed.</Text>
                  </View>
                )}

                {details.status === 'failed' && (
                  <View style={styles.failedNotice}>
                    <Ionicons name="alert-circle" size={20} color={THEME.colors.danger} />
                    <Text style={styles.failedNoticeText}>This stop failed and is locked for dispatch audit.</Text>
                  </View>
                )}

                {details.allowedNextActions.includes('en_route') && (
                  <Button
                    title="Start Transit (En Route)"
                    variant="primary"
                    loading={updating}
                    icon={<Ionicons name="navigate-outline" size={18} color={THEME.colors.white} />}
                    onPress={() => handleStatusTransition('en_route')}
                  />
                )}

                {details.allowedNextActions.includes('arrived') && (
                  <Button
                    title="Record Arrival at Stop"
                    variant="secondary"
                    loading={updating}
                    icon={<Ionicons name="location" size={18} color={THEME.colors.white} />}
                    onPress={() => handleStatusTransition('arrived')}
                  />
                )}

                {details.allowedNextActions.includes('in_progress') && (
                  <Button
                    title="Start Cargo Operations"
                    variant="primary"
                    loading={updating}
                    icon={<Ionicons name="cube-outline" size={18} color={THEME.colors.white} />}
                    onPress={() => handleStatusTransition('in_progress')}
                  />
                )}

                {details.allowedNextActions.includes('completed') && (
                  details.stopType === 'delivery' || details.stopType === 'pickup_delivery' ? (
                    <Button
                      title="Deliver Cargo & Collect Proof"
                      variant="primary"
                      loading={updating}
                      icon={<Ionicons name="checkmark-done-circle" size={18} color={THEME.colors.white} />}
                      onPress={() => setDeliveryModalVisible(true)}
                    />
                  ) : (
                    <Button
                      title="Complete Pickup Verification"
                      variant="primary"
                      loading={updating}
                      icon={<Ionicons name="checkmark-circle" size={18} color={THEME.colors.white} />}
                      onPress={() => handleStatusTransition('completed')}
                    />
                  )
                )}

                {details.allowedNextActions.includes('failed') && (
                  <Button
                    title="Report Operational Issue / Failure"
                    variant="danger"
                    loading={updating}
                    icon={<Ionicons name="alert-circle-outline" size={18} color={THEME.colors.white} />}
                    onPress={() => setFailureModalVisible(true)}
                  />
                )}
              </View>
            </Card>

            {/* Proof of Delivery Card (If available) */}
            {details.proofOfDelivery && (
              <Card style={styles.podCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="shield-checkmark" size={18} color={THEME.colors.success} />
                  <Text style={styles.cardHeaderTitle}>Proof of Delivery (POD)</Text>
                  <Badge label="DRIVER REPORTED" variant="neutral" />
                </View>
                <View style={styles.podContent}>
                  <Text style={styles.podType}>Verification Type: <Text style={{ fontWeight: '700', color: THEME.colors.text }}>{details.proofOfDelivery.type.toUpperCase()}</Text></Text>
                  {details.recipient?.name && (
                    <Text style={styles.podRecipient}>Recipient: <Text style={{ color: THEME.colors.text }}>{details.recipient.name} {details.recipient.phone ? `(${details.recipient.phone})` : ''}</Text></Text>
                  )}
                  {details.proofOfDelivery.submittedAt && (
                    <Text style={styles.podDate}>Submitted: {formatTimestamp(details.proofOfDelivery.submittedAt)}</Text>
                  )}
                  <Text style={styles.podDisclaimer}>Note: Awaiting central dispatch audit confirmation.</Text>
                </View>
              </Card>
            )}

            {/* Associated Cargo & Shipments Card */}
            <Card style={styles.cargoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="file-tray-full-outline" size={18} color={THEME.colors.primaryLight} />
                <Text style={styles.cardHeaderTitle}>Shipments for This Stop ({details.shipments.length})</Text>
              </View>

              {details.shipments.length === 0 ? (
                <Text style={styles.emptyShipmentsText}>No cargo handling at this waypoint.</Text>
              ) : (
                details.shipments.map((s, idx) => (
                  <View key={`${s.shipmentId}-${idx}`} style={styles.shipmentRow}>
                    <View style={styles.shipmentTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shipmentRef}>{s.reference}</Text>
                        <Text style={styles.shipmentDesc}>{s.cargoDescription}</Text>
                      </View>
                      <Badge
                        label={s.operation === 'pickup' ? 'LOAD' : 'DELIVER'}
                        variant={s.operation === 'pickup' ? 'primary' : 'warning'}
                      />
                    </View>

                    <View style={styles.shipmentBottomRow}>
                      <Text style={styles.shipmentWeight}>
                        Manifest Weight: <Text style={styles.boldWhite}>{s.weightKg.toLocaleString()} kg</Text>
                      </Text>
                      {s.deliveredWeightKg !== null && s.deliveredWeightKg !== undefined && (
                        <Text style={styles.shipmentDelivered}>
                          Delivered: <Text style={styles.boldWhite}>{s.deliveredWeightKg.toLocaleString()} kg</Text>
                        </Text>
                      )}
                      <Badge
                        label={s.status.toUpperCase()}
                        variant={
                          s.status === 'delivered' || s.status === 'loaded'
                            ? 'success'
                            : s.status === 'failed'
                            ? 'danger'
                            : s.status === 'partial'
                            ? 'warning'
                            : 'neutral'
                        }
                      />
                    </View>

                    {s.failureReason && (
                      <Text style={styles.shipmentFailureReason}>Issue: {s.failureReason}</Text>
                    )}
                  </View>
                ))
              )}
            </Card>

            {/* Operational Instructions Card */}
            <Card style={styles.instructionsCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="list-circle-outline" size={18} color={THEME.colors.secondary} />
                <Text style={styles.cardHeaderTitle}>Stop Standard Operating Procedures</Text>
              </View>
              {details.instructions.map((inst, idx) => (
                <View key={idx} style={styles.instructionItem}>
                  <Text style={styles.instructionIndex}>{idx + 1}.</Text>
                  <Text style={styles.instructionText}>{inst}</Text>
                </View>
              ))}
            </Card>

            {/* Audit History Timeline */}
            {details.transitionHistory && details.transitionHistory.length > 0 && (
              <Card style={styles.auditCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="time-outline" size={18} color={THEME.colors.info} />
                  <Text style={styles.cardHeaderTitle}>Transition Audit History</Text>
                </View>
                {details.transitionHistory.map((th, idx) => (
                  <View key={idx} style={styles.auditItem}>
                    <View style={styles.auditDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.auditTransition}>
                        {th.fromStatus} <Ionicons name="arrow-forward" size={12} color={THEME.colors.textMuted} /> {th.toStatus}
                      </Text>
                      <Text style={styles.auditAuthor}>By: {th.driverName} • {formatTimestamp(th.timestamp)}</Text>
                      {th.reason && <Text style={styles.auditReason}>Reason: {th.reason}</Text>}
                      {th.notes && <Text style={styles.auditNotes}>Notes: {th.notes}</Text>}
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        ) : null}
      </ScrollView>

      {/* Report Failure Modal */}
      <Modal
        visible={failureModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFailureModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="alert-circle" size={24} color={THEME.colors.danger} />
              <Text style={styles.modalTitle}>Report Stop Failure</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Please describe the reason for being unable to complete operations at {stopName}.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Consignee closed, cargo rejected, road blocked..."
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              numberOfLines={3}
              value={failureReasonInput}
              onChangeText={setFailureReasonInput}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setFailureModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Submit Failure"
                variant="danger"
                onPress={submitFailure}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delivery Confirmation & POD Modal */}
      <Modal
        visible={deliveryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeliveryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.podModalScroll}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="checkmark-done-circle" size={26} color={THEME.colors.success} />
                <Text style={styles.modalTitle}>Confirm Delivery & Proof</Text>
              </View>

              <Text style={styles.inputLabel}>RECIPIENT FULL NAME *</Text>
              <TextInput
                style={styles.singleInput}
                placeholder="Receiver full name"
                placeholderTextColor={THEME.colors.textMuted}
                value={recipientName}
                onChangeText={setRecipientName}
              />

              <Text style={styles.inputLabel}>RECIPIENT CONTACT NUMBER</Text>
              <TextInput
                style={styles.singleInput}
                placeholder="Phone number"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="phone-pad"
                value={recipientPhone}
                onChangeText={setRecipientPhone}
              />

              <Text style={styles.inputLabel}>VERIFICATION METHOD</Text>
              <View style={styles.podTypeSelector}>
                {(['acknowledgement', 'otp', 'signature', 'photo'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.podTypeButton,
                      podType === type && styles.podTypeButtonActive,
                    ]}
                    onPress={() => setPodType(type)}
                  >
                    <Text
                      style={[
                        styles.podTypeButtonText,
                        podType === type && styles.podTypeButtonTextActive,
                      ]}
                    >
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {podType === 'otp' && (
                <>
                  <Text style={styles.inputLabel}>RECIPIENT OTP CODE</Text>
                  <TextInput
                    style={styles.singleInput}
                    placeholder="Enter 4-6 digit OTP"
                    placeholderTextColor={THEME.colors.textMuted}
                    keyboardType="number-pad"
                    value={podCode}
                    onChangeText={setPodCode}
                  />
                </>
              )}

              {/* Partial Delivery Toggle */}
              <TouchableOpacity
                style={styles.partialCheckbox}
                onPress={() => setIsPartialDelivery(!isPartialDelivery)}
              >
                <Ionicons
                  name={isPartialDelivery ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={isPartialDelivery ? THEME.colors.primaryLight : THEME.colors.textMuted}
                />
                <Text style={styles.partialCheckboxLabel}>Partial Delivery (Quantity Mismatch)</Text>
              </TouchableOpacity>

              {isPartialDelivery && (
                <View style={styles.partialBox}>
                  <Text style={styles.inputLabel}>ACTUAL DELIVERED WEIGHT (KG) *</Text>
                  <TextInput
                    style={styles.singleInput}
                    placeholder="e.g. 450"
                    placeholderTextColor={THEME.colors.textMuted}
                    keyboardType="numeric"
                    value={partialWeightInput}
                    onChangeText={setPartialWeightInput}
                  />

                  <Text style={styles.inputLabel}>PARTIAL DELIVERED REASON *</Text>
                  <TextInput
                    style={styles.singleInput}
                    placeholder="e.g. Warehouse space shortage, box damage"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={partialReasonInput}
                    onChangeText={setPartialReasonInput}
                  />
                </View>
              )}

              <Text style={styles.inputLabel}>HANDOVER NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Remarks regarding package condition or handover..."
                placeholderTextColor={THEME.colors.textMuted}
                multiline
                value={deliveryNotes}
                onChangeText={setDeliveryNotes}
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setDeliveryModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Complete Delivery"
                  variant="primary"
                  onPress={submitDeliveryCompletion}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </ScrollView>
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
  loadingContainer: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  loadingText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
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
  statusCard: {
    gap: THEME.spacing.md,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
  },
  stopTitle: {
    ...THEME.typography.titleMedium,
    color: THEME.colors.text,
    marginTop: 2,
  },
  failureBox: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.dangerBg,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    gap: 8,
  },
  failureTitle: {
    ...THEME.typography.caption,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  failureText: {
    ...THEME.typography.caption,
    color: THEME.colors.danger,
    marginTop: 2,
  },
  timestampsGrid: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: THEME.spacing.sm,
  },
  timestampItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampLabel: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  timestampValue: {
    ...THEME.typography.caption,
    color: THEME.colors.text,
    fontWeight: '600',
  },
  actionControls: {
    gap: THEME.spacing.sm,
    marginTop: 4,
  },
  actionControlsLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.successBg,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  completedNoticeText: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.success,
    fontWeight: '600',
  },
  failedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.dangerBg,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  failedNoticeText: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.danger,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  cardHeaderTitle: {
    ...THEME.typography.titleSmall,
    color: THEME.colors.text,
    flex: 1,
  },
  podCard: {
    gap: 6,
  },
  podContent: {
    gap: 4,
  },
  podType: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  podRecipient: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  podDate: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  podDisclaimer: {
    ...THEME.typography.caption,
    color: THEME.colors.secondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  cargoCard: {
    gap: THEME.spacing.sm,
  },
  emptyShipmentsText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    paddingVertical: THEME.spacing.sm,
  },
  shipmentRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 6,
  },
  shipmentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shipmentRef: {
    ...THEME.typography.bodyMedium,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  shipmentDesc: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
  },
  shipmentBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shipmentWeight: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  shipmentDelivered: {
    ...THEME.typography.caption,
    color: THEME.colors.info,
  },
  boldWhite: {
    color: THEME.colors.text,
    fontWeight: '700',
  },
  shipmentFailureReason: {
    ...THEME.typography.caption,
    color: THEME.colors.danger,
    marginTop: 2,
  },
  instructionsCard: {
    gap: THEME.spacing.sm,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  instructionIndex: {
    ...THEME.typography.caption,
    color: THEME.colors.primaryLight,
    fontWeight: '700',
    width: 16,
  },
  instructionText: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  auditCard: {
    gap: THEME.spacing.sm,
  },
  auditItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderLeftWidth: 2,
    borderLeftColor: THEME.colors.border,
    paddingLeft: 8,
    marginBottom: 6,
  },
  auditDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primaryLight,
    marginTop: 6,
    marginLeft: -12,
  },
  auditTransition: {
    ...THEME.typography.caption,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  auditAuthor: {
    ...THEME.typography.caption,
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  auditReason: {
    ...THEME.typography.caption,
    color: THEME.colors.danger,
    marginTop: 2,
  },
  auditNotes: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: THEME.spacing.md,
  },
  podModalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: THEME.spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalTitle: {
    ...THEME.typography.titleMedium,
    color: THEME.colors.text,
  },
  modalSubtitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  inputLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  singleInput: {
    backgroundColor: THEME.colors.surfaceHover,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    color: THEME.colors.text,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    fontSize: 14,
  },
  modalInput: {
    backgroundColor: THEME.colors.surfaceHover,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    color: THEME.colors.text,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  podTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  podTypeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceHover,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  podTypeButtonActive: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
  },
  podTypeButtonText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    fontSize: 11,
  },
  podTypeButtonTextActive: {
    color: THEME.colors.primaryLight,
  },
  partialCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  partialCheckboxLabel: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.text,
  },
  partialBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginTop: THEME.spacing.md,
  },
});
