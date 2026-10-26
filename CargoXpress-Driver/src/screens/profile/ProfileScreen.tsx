import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../constants/theme';
import { AppNavigationProp } from '../../navigation/types';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { driver, logout, refreshProfile } = useAuth();
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to end your driver cockpit session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Driver Profile"
        subtitle="Credentials & Credentials"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={40} color={THEME.colors.primaryLight} />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driver?.name || 'Driver'}</Text>
              <Text style={styles.driverCompany}>
                Transport Company ID: {driver?.companyId?.slice(-6).toUpperCase() || 'N/A'}
              </Text>
              <View style={styles.statusBadgeRow}>
                <Badge
                  label={driver?.status ? driver.status.replace('_', ' ') : 'ACTIVE'}
                  variant={driver?.status === 'on_duty' ? 'success' : 'primary'}
                  size="small"
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Credentials & Identification Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="id-card-outline" size={20} color={THEME.colors.primaryLight} />
            <Text style={styles.sectionTitle}>Identity & Verification</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>COMMERCIAL LICENSE NUMBER</Text>
            <Text style={styles.fieldValue}>{driver?.licenseNumber || 'Not registered'}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>REGISTERED MOBILE PHONE</Text>
            <Text style={styles.fieldValue}>{driver?.phone || 'Not registered'}</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <Text style={styles.fieldValue}>{driver?.emailId || 'Not registered'}</Text>
          </View>
        </Card>

        {/* Active Duty Assignment Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bus-outline" size={20} color={THEME.colors.secondary} />
            <Text style={styles.sectionTitle}>Vehicle Assignment</Text>
          </View>

          {driver?.assignedTruck ? (
            <View style={styles.assignedBox}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>ASSIGNED VEHICLE PLATE</Text>
                <Text style={styles.plateHighlight}>
                  {driver.assignedTruck.licensePlate}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>ASSIGNED AT</Text>
                <Text style={styles.fieldValue}>
                  {new Date(driver.assignedTruck.assignedAt).toLocaleString()}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.unassignedNotice}>
              No active vehicle assigned. Assignments are managed by your fleet dispatcher.
            </Text>
          )}
        </Card>

        {/* App Meta & Sign Out */}
        <View style={styles.actionSection}>
          <Button
            title="Sign Out of Cockpit"
            onPress={handleLogout}
            variant="danger"
            size="large"
            loading={loggingOut}
            icon={<Ionicons name="log-out-outline" size={20} color={THEME.colors.white} />}
          />

          <Text style={styles.versionText}>CargoXpress Driver v1.0.0 • Build 2026.1</Text>
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
  profileCard: {
    padding: THEME.spacing.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
    gap: 4,
  },
  driverName: {
    ...THEME.typography.titleMedium,
    color: THEME.colors.text,
  },
  driverCompany: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  statusBadgeRow: {
    marginTop: 2,
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
  fieldRow: {
    gap: 2,
  },
  fieldLabel: {
    ...THEME.typography.badge,
    color: THEME.colors.textMuted,
    fontSize: 10,
  },
  fieldValue: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  assignedBox: {
    gap: THEME.spacing.sm,
  },
  plateHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
    letterSpacing: 0.5,
  },
  unassignedNotice: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  actionSection: {
    marginTop: THEME.spacing.sm,
    gap: THEME.spacing.md,
  },
  versionText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
