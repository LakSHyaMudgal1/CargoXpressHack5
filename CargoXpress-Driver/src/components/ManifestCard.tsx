import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { ManifestShipment } from '../types/trip';
import { Badge } from './Badge';

interface ManifestCardProps {
  manifest: ManifestShipment[];
}

export const ManifestCard: React.FC<ManifestCardProps> = ({ manifest }) => {
  if (!manifest || manifest.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No consolidated shipment items recorded.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {manifest.map((item, idx) => {
        const isCarrier = item.role === 'carrier';
        return (
          <View key={`${item.truckId}-${idx}`} style={styles.itemRow}>
            <View style={styles.headerRow}>
              <View style={styles.titleWithIcon}>
                <Ionicons
                  name={isCarrier ? 'shield-checkmark' : 'git-merge'}
                  size={18}
                  color={isCarrier ? THEME.colors.primaryLight : THEME.colors.secondary}
                />
                <Text style={styles.plateText}>{item.licensePlate}</Text>
              </View>
              <Badge
                label={isCarrier ? 'CARRIER SHIPMENT' : 'ABSORBED CARGO'}
                variant={isCarrier ? 'primary' : 'warning'}
                size="small"
              />
            </View>

            <View style={styles.detailsBlock}>
              <Text style={styles.label}>
                Corridor:{' '}
                <Text style={styles.value}>
                  {item.stops[0]} → {item.stops[item.stops.length - 1]}
                </Text>
              </Text>
              <Text style={styles.label}>
                Stops ({item.stops.length}):{' '}
                <Text style={styles.stopsValue}>{item.stops.join(' • ')}</Text>
              </Text>
              {item.load && item.load.length > 0 && (
                <Text style={styles.label}>
                  Cargo Profile:{' '}
                  <Text style={styles.value}>
                    {item.load.map(l => `${l} kg`).join(' → ')}
                  </Text>
                </Text>
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
    gap: THEME.spacing.sm,
  },
  emptyContainer: {
    padding: THEME.spacing.sm,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  itemRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plateText: {
    color: THEME.colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailsBlock: {
    gap: 4,
  },
  label: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
  value: {
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  stopsValue: {
    color: THEME.colors.textSecondary,
    fontWeight: '400',
  },
});
